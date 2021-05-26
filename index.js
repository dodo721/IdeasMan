const Discord = require("discord.js");
const config = require("./config.json");
const fs = require('fs');
const generateMessage = require("./imgmanip");

let ideas = require("./ideas.json");
let regUsers = require("./reg_users.json");

console.log("Loading...");

const captureGlyphs = {
	"'" : "'",
	'"' : '"',
	"(" : ")"
};

const removeEscapes = str => {
	let res = str;
	Object.keys(captureGlyphs).forEach(glyph => {
		res = res.replace("\\" + glyph, glyph);
		res = res.replace("\\" + captureGlyphs[glyph], captureGlyphs[glyph]);
	});
	return res;
};

const parseArgs = cmd => {
	let res = [];
	let terminator = null;
	const parts = cmd.split(" ");
	parts.forEach(part => {
		if (!part) return;
		if (terminator) {
			if (part.endsWith(terminator) && !part.endsWith("\\" + terminator)) {
				const toAdd = part.substring(0, part.length - terminator.length);
				terminator = null;
				res[res.length - 1] += " " + removeEscapes(toAdd);
				return;
			}
			res[res.length - 1] += " " + removeEscapes(part);
			return;
		}
		Object.keys(captureGlyphs).forEach(initiator => {
			if (part.startsWith(initiator) && !part.startsWith("\\" + initiator)) {
				terminator = captureGlyphs[initiator];
				res.push(removeEscapes(part.replace(initiator, "")));
			}
		});
		if (terminator) return;
		res.push(removeEscapes(part));
	});
	return res;
};


const addIdea = (userId, idea) => {
	const ideaObj = {userId, idea};
	ideas.push(ideaObj);
	return new Promise ((resolve, reject) => {
		fs.writeFile('./ideas.json', JSON.stringify(ideas, null, 2), function (err) {
			if (err) reject(err);
			resolve(ideas);
		});
	});
}

const register = (username, userId) => {
	regUsers[username] = userId;
	console.log(regUsers);
	return new Promise ((resolve, reject) => {
		fs.writeFile('./reg_users.json', JSON.stringify(regUsers, null, 2), function (err) {
			if (err) reject(err);
			resolve(regUsers);
		});
	});
}


const client = new Discord.Client();

const getUser = async(id, channel) => {
	let user;
	await client.users.fetch(id).then(u => user = u).catch(err => {
		console.error(err);
		channel.send("Could not find user!");
	});
	return user;
}

client.on("message", async function(message) {
	if (message.author.bot) return;

	const content = message.content;
	const channel = message.channel;

	const args = parseArgs(content);
	if (!args.length) return;
	if (args[0] !== "!idea" && args[0] !== "!i") return;

	if (args.length > 1 && args[1] === "-a") {
		console.log("Adding idea...");
		if (args.length < 4) {
			channel.send("Useage: !i -a <userID> <idea>");
			return;
		}
		console.log("Checking user...");
		const name = args[2];
		let userId;

		let possibleMatches = [];
		Object.keys(regUsers).forEach(uname => {
			const cmp1 = name.replace(" ", "").replace("_", "").replace("-","").toLowerCase();
			const cmp2 = uname.replace(" ", "").replace("_", "").replace("-","").toLowerCase();
			if (cmp1 === cmp2) {
				userId = regUsers[uname];
			} else {
				if (cmp1.includes(cmp2) || cmp2.includes(cmp1)) possibleMatches.push(uname);
			}
		});

		if (!userId) userId = name;
		let user = await getUser(userId, channel);
		if (!user) {
			channel.send("Note: If this is the first time adding an idea for this user, you will need to add the idea using their ID first.");
			const embed = new Discord.MessageEmbed()
				.setColor('#0099ff')
				.setTitle('Possible matches')
				.setDescription(possibleMatches.join("\n"))
			if (possibleMatches.length) channel.send(embed);
			return;
		}

		register(user.username, user.id);

		console.log("Recording...");

		const idea = [...args].splice(3, args.length - 3).join(" ");

		await addIdea(user.id, idea).then(() => channel.send("Wow " + user.username + ", big fucking brain")).catch(err => {
			console.error(err);
			channel.send("Error while trying to add idea, try again");
		});

		const img = await generateMessage(user, idea);
		const attachment = new Discord.MessageAttachment(img, 'idea.png');
		channel.send(null, attachment);

		console.log("Done!");
	} else if (args.length > 1 && (args[1] === "-users" || args[1] === "-u")) {
		const embed = new Discord.MessageEmbed()
			.setColor('#0099ff')
			.setTitle('Cached users')
			.setDescription(Object.keys(regUsers).join("\n"));
		channel.send(embed);
	} else {

		const idea = ideas[Math.floor(Math.random() * ideas.length)];
		let user = await getUser(idea.userId, channel);
		if (!user) return;
		const img = await generateMessage(user, idea.idea);
		const attachment = new Discord.MessageAttachment(img, 'idea.png');
		channel.send(null, attachment);

	}


});

client.login(config.BOT_TOKEN);

console.log("Bot running!");
