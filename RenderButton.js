import Buffer from 'node:buffer';
import sharp from 'sharp';
import {fabric} from 'fabric';

sharp.concurrency(10);

export default class RenderButton {
	async render(options = {}) {
		const {keyIndex, label: textString, backgroundColor} = options;
		const time = Date.now();
		console.log(`render ${keyIndex} ${textString} ${time}`);
		// Const canvas = new fabric.Canvas()
		const canvas = new fabric.StaticCanvas(null, {
			backgroundColor,
			width: options.streamDeck.ICON_SIZE,
			height: options.streamDeck.ICON_SIZE,
			renderOnAddRemove: false,
		});
		if (textString) {
			const text = new fabric.Textbox(textString, {
				fill: '#FFFFFF',
				fontFamily: 'Source Sans Pro',
				textAlign: 'center',
			});
			canvas.add(text);
			text.scaleToWidth(options.streamDeck.ICON_SIZE);
			if (text.getScaledHeight() > options.streamDeck.ICON_SIZE) {
				text.scaleToHeight(options.streamDeck.ICON_SIZE);
			}

			text.center();
		}

		try {
			console.log(`render ${keyIndex} ${textString}: buffering ${(Date.now() - time) / 1000}`);
			const imgBuff = await sharp(Buffer.from(canvas.toSVG()))
			// .resize(options.streamDeck.ICON_SIZE, options.streamDeck.ICON_SIZE)
				.flatten()
				.raw()
				.toBuffer();
			console.log(`render ${keyIndex} ${textString}: sending ${(Date.now() - time) / 1000}`);
			return imgBuff;
		} catch (error) {
			console.log('error inside render', error);
		}
	}
}
