The idea for the config YAML is that every controller has it's own section where feedback can be defined based on certain things.

In case of the MidiController it is buttons and their `noteOn` or `noteOff` things.

In case of the AtemController it will be based on the `state` and how that can be mapped together.

These feedbacks then have certain `action chains` attached which get pushed to the global queue and executed. Things like `Delay`, `NoteOn` and more can be sent through.

The beauty of this model is that the things are separate from each other and do not depend on one another. Even if one module is not present the others would still work and all actions (except the one that is not present) would still execute.

The YAML should be able to be sent from the frontend. Ideally in some way so that it can also be "hot reloaded" in some way.
