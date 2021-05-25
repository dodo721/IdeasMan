const Canvas = require("canvas");
const sizeOf = require("image-size");
const webp = require('webp-converter');
const fs = require("fs");
const request = require('request');

const downloadImg = (uri, filename) => {
	return new Promise ((resolve, reject) => {
		request.head(uri, (err, res, body) => {
			if (err) reject(err);
			//console.log('content-type:', res.headers['content-type']);
			//console.log('content-length:', res.headers['content-length']);

			request(uri).pipe(fs.createWriteStream(filename)).on('close', () => resolve());
		});
	});
};

function formatAMPM(date) {
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var ampm = hours >= 12 ? 'pm' : 'am';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = minutes < 10 ? '0'+minutes : minutes;
	var strTime = hours + ':' + minutes + ' ' + ampm;
	return strTime;
}

const generateMessage = async (user, idea) => {

	// Measure and word wrap idea text size and get final size for image
	const testcanvas = Canvas.createCanvas(500, 300);
	const testctx = testcanvas.getContext('2d');
	testctx.font = `18px Whitney`;
	let text = idea;
	let max_width = 500 - 75;
	let width = 0, i, j;
	let result;
	let lines = [];
	while ( text.length ) {
		for( i=text.length; testctx.measureText(text.substr(0,i)).width > max_width; i-- );
	
		result = text.substr(0,i);
	
		if ( i !== text.length )
			for( j=0; result.indexOf(" ",j) !== -1; j=result.indexOf(" ",j)+1 );
	
		lines.push( result.substr(0, j|| result.length) );
		width = Math.max( width, testctx.measureText(lines[ lines.length-1 ]).width );
		text  = text.substr( lines[ lines.length-1 ].length, text.length );
	}

	const canvas = Canvas.createCanvas(500, lines.length * 20 + 60);
	const ctx = canvas.getContext('2d');

	// Load profile picture
	if (!fs.existsSync("./pfps/" + user.id + ".jpg")) {
		console.log("Getting new user pfp...");
		await downloadImg(user.avatarURL(), "./pfps/" + user.id + ".webp");
		await webp.dwebp("./pfps/" + user.id + ".webp", "./pfps/" + user.id + ".jpg","-o",logging="-v").then(res => console.log(res));
		fs.unlinkSync("./pfps/" + user.id + ".webp");
	}
	const img = await Canvas.loadImage("./pfps/" + user.id + ".jpg");
	
	const pfpSize = 50;

	// Circle crop and draw pfp
	ctx.save();
	ctx.beginPath();
	ctx.arc(pfpSize / 2, pfpSize / 2, pfpSize / 2, 0, 2 * Math.PI, false);
	ctx.clip();
	ctx.drawImage(img, 0, 0, pfpSize, pfpSize);
	ctx.restore();
	
	// Draw name
	ctx.fillStyle = "white";
	ctx.font = `18px Whitney`;
	txtwidth = ctx.measureText(user.username).width;
	ctx.fillText(user.username, 75, 15);
	// Draw timestamp
	ctx.font = `14px Whitney`;
	ctx.fillStyle = "grey";
	ctx.fillText("Today at " + formatAMPM(new Date()), 75 + txtwidth + 15, 15);
	// Draw message
	ctx.font = `18px Whitney`;
	ctx.fillStyle = "rgba(200,200,200,1)";
	lines.forEach((line, i) => {
		ctx.fillText(line, 75, 40 + (20 * i));
	});

	return canvas.toBuffer();
}

module.exports = generateMessage;
