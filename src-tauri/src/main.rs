#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use std::sync::{Mutex, Arc};
use regex::Regex;
use tauri::{
  api::process::{Command, CommandEvent},
  Manager,
  Menu,
  MenuItem,
  Submenu,
  CustomMenuItem,
  SystemTray,
  SystemTrayMenu,
  SystemTrayEvent
};


fn main() {
  let menu_system_tray = SystemTrayMenu::new()
    .add_item(CustomMenuItem::new("show".to_string(), "Show"))
    .add_item(CustomMenuItem::new("quit".to_string(), "Quit"));

  let menu_app = Menu::new()
    .add_native_item(MenuItem::About("ConnectThemAll".to_string()))
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Hide)
    .add_native_item(MenuItem::HideOthers)
    .add_native_item(MenuItem::ShowAll)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Quit);

  let menu_edit = Menu::new()
    .add_native_item(MenuItem::Undo)
    .add_native_item(MenuItem::Redo)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::Cut)
    .add_native_item(MenuItem::Copy)
    .add_native_item(MenuItem::Paste)
    .add_native_item(MenuItem::Separator)
    .add_native_item(MenuItem::SelectAll);

  let menu_window = Menu::new()
    .add_native_item(MenuItem::CloseWindow)
    .add_native_item(MenuItem::EnterFullScreen)
    .add_native_item(MenuItem::Minimize)
    .add_native_item(MenuItem::Zoom);

  let menu_complete = Menu::new()
    .add_submenu(Submenu::new("ConnectThemAll", menu_app))
    .add_submenu(Submenu::new("Edit", menu_edit))
    .add_submenu(Submenu::new("Window", menu_window));


  tauri::Builder::default()
    // Menu Configuration
    .menu(menu_complete)
    // System Tray Configuration
    .system_tray(SystemTray::new().with_menu(menu_system_tray))
    .on_system_tray_event(|app, event| match event {
      SystemTrayEvent::MenuItemClick { id, .. } => {
        match id.as_str() {
          "quit" => {
            std::process::exit(0);
          }
          "show" => {
            let window = app.get_window("main");
            if !window.is_some() {
              // TODO: Currently defaults to always opening a new window becuase the `app.get_window….is_some()` is buggy
              println!("WINDOW EXISTS JUST SHOW IT");
              let win_unwr = window.unwrap();
              win_unwr.show().unwrap();
              win_unwr.set_focus().unwrap();
            } else {
              println!("WINDOW NEEDS TO BE CREATED");
              // app.create_window(
              //   "Tauri".into(),
              //   WindowUrl::App("index.html".into()),
              //   |window_builder, webview_attributes| { (window_builder.title("Tauri"), webview_attributes) }
              // ).unwrap();
            }
          }
          _ => {}
        }
      }
      _ => {}
    })
    // Setup the App
    .setup(|app| {
      let window = app.get_window("main").unwrap();

      // Managing the Sidecar Backend & Communication
      tauri::async_runtime::spawn(async move {
        // Launching the Sidecar Backend
        let command = Command::new_sidecar("backend")
          .expect("failed to setup `backend` sidecar (possibly not found)")
          .args(&["--tauri"]); // have the backend know that we are running inside tauri
        let (mut rx, child) = command.spawn().expect("Failed to spawn packaged node");

          // Receiving events emitted by frontend
        // and writing them to the child process of the Backend
        let child = Arc::new(Mutex::new(child));
        window.listen("frontend-event", move |event| {
          println!("logFrontend: {:?}", event.payload());
          child.lock().unwrap().write(format!("toBackend:{}\n", event.payload().unwrap()).as_bytes()).unwrap();
        });

        // Receiving of the events from inside the Backend
        // and then emitting those events further so the frontend can have them
        tauri::async_runtime::spawn(async move {
          while let Some(event) = rx.recv().await {
            if let CommandEvent::Stdout(line) = event {
              println!("logBackend: {:?}", line);
              if line.starts_with("toFrontend:") { // if the line starts with `toFrontend:` then send it as an event to the open window
                let re = Regex::new(r"^toFrontend:").unwrap(); // define regex to remove the `toFrontend:` part.
                // TODO: testing if this actually works?!
                window.emit("backend-event", re.replace_all(&line, "")).expect("failed to emit event");
              }
            }
          }
        })

      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
