const gifSearch = require("gif-search")
const filter = require("leo-profanity")
const bad_words = require("./bad_words.json")
const config = require("./config.json")
const _ = require("underscore")
const ytdl = require("ytdl-core-discord")
const Discord = require("discord.js")
const googleTTS = require("google-tts-api")
const https = require("https")
const fs = require("fs")

const client = new Discord.Client()

const parse_command = async (msg: string): Promise<string[]> => {
    let message_split = msg.split(" ")

    if (message_split[0].startsWith(config.command_start)) {
        message_split[0] = message_split[0].replace(config.command_start, "")
        return message_split
    }

    throw "Message did not start with command string."
}

const filter_message = async (msg: any) => {
    if (!config.profanity_filter) {
        return true
    }
    let cleaned_message = msg.content.replaceAll(/\W/g, "")
    let characters_left = 2
    let removal_character = "🍕"

    if (filter.check(msg.content)) {
        let filtered_message = filter.clean(msg.content, removal_character, characters_left)
        msg.delete()
        msg.channel.send(`${msg.author.toString()}:\n\`${filtered_message}\``)
        throw "Message contained profanity."
    }
    if (filter.check(cleaned_message)) {
        let filtered_message = filter.clean(cleaned_message, removal_character, characters_left)
        msg.delete()
        msg.channel.send(`${msg.author.toString()}:\n\`${filtered_message}\``)
        throw "Message contained profanity."
    }
}

const play = async (connection: any, url: string) => {
    connection.play(await ytdl(url), { type: "opus" })
}

const handle_command = async (msg: any, msg_split: string[]): Promise<any> => {
    if (msg_split[0] == "random") {
        if (msg_split[1] == "option") {
            let option_size = parseInt(msg_split[2])
            let options = _.sample(msg_split.splice(3), option_size)
            msg.channel.send(options.join("\n")).then(() => {
                return true
            })
        }
    }
    if (msg_split[0] == "credit") {
        msg.channel.send("Nick.").then(() => {
            return true
        })
    }
    if (msg_split[0] == "play") {
        let youtube_link = msg_split[1]
        if (!msg.member.voice.channel) {
            throw "You must be in a voice channel."
        }
        msg.member.voice.channel.join().then((connection: any) => {
            play(connection, youtube_link).then(() => {
                return true
            }).catch((e) => {
                throw "That is not a youtube link."
            })
        })
    }
    if (msg_split[0] == "dc") {
        if (msg.guild.me.voice.channel) {
            msg.guild.me.voice.channel.leave()
            msg.channel.send("Disconnected.").then(() => {
                return true
            })
        } else {
            throw "Not in a voice channel."
        }
    }
    if (msg_split[0] == "gif") {
        let gif = msg_split.splice(1).join(" ")
        gifSearch.random(gif).then((gifUrl: string) => {
            msg.channel.send(gifUrl || "No gifs found.").then(() => {
                return true
            })
        }).catch((e: any) => {
            msg.channel.send("No gifs found.")
        })
    }
    if (msg_split[0] == "tts") {
        if (!msg_split[1]) {
            throw "Write something."
        }
        let message = msg_split.splice(1).join(" ")
        if (message.length > 200) {
            throw "Message too long."
        }
        if (!msg.member.voice.channel) {
            throw "You must be in a voice channel."
        }
        let tts_url = googleTTS.getAudioUrl(message, { lang: "vi-VN", slow: false, host: "https://translate.google.com" })
        let file = fs.createWriteStream("./tts.mp3")
        msg.member.voice.channel.join().then((connection: any) => {
            https.get(tts_url, (response: any) => {
                response.pipe(file)
                connection.play("./tts.mp3")
            })
        })
    }
}

client.on("ready", () => {
    console.log(`Logged in as ${client.user.tag}.`)
})

client.on("message", (msg: any) => {
    if (msg.channel instanceof Discord.DMChannel) {
        return true
    }
    if (msg.author.bot) {
        return true
    }
    filter_message(msg).then(() => {
        parse_command(msg.content).then((msg_split) => {
            handle_command(msg, msg_split).catch(e => {
                msg.channel.send(e)
            })
        }).catch((e) => {
            console.log(e, msg.content)
        })
    }).catch((e: any) => {
    })
})

client.on("messageUpdate", (oldmsg: any, msg: any) => {
    if (msg.channel instanceof Discord.DMChannel) {
        return true
    }
    filter_message(msg).catch((e: any) => {
    })
})

client.login(config.bot_token).then(() => {
    client.user.setActivity("robot.")
})