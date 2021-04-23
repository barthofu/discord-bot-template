const UserPattern   = require("../models/User.js"),
      GuildPattern  = require("../models/Guild.js")

module.exports = {


    
    checkDaily() {

        let day = dateFormat(new Date(), "dd")
        if (day != db.data.get("currentDay").value()) {

            db.data.set("currentDay", day).write()

            //stuff to do each day
            client.updateStats()
            if (config.backup.enabled) client.backup()
        }
    },



    checkUser (userID) {

        //check if this user exists in the database, if not it creates it
        if (!db.users.find(val => val.id === userID).value()) {
            //creation
            let user = new UserPattern(bot.users.cache.get(userID))
            db.users.push(user.object).write()
        }
    },



    checkGuild (guildID) {

        //check if this guild exists in the database, if not it creates it (or recovers it from the deleted ones)
        if (!db.guilds.get("actives").has(guildID).value()) {

            if (db.guilds.get("deleted").has(guildID).value()) {
                //recover
                db.guilds.set(`actives.${guildID}`, db.guilds.get(`deleted.${guildID}`).value()).write()
                db.guilds.get(`deleted`).unset(guildID).write()
            } else {
                //creation
                let guild = new GuildPattern(bot.guilds.cache.get(guildID))
                db.guilds.set(`actives.${guildID}`, guild.object).write()
            }
        }
        else if (!bot.guilds.cache.get(guildID)) { //check if guild exists. If no, the guild is deleted

            //deletion
            db.guilds.set(`deleted.${guildID}`, db.guilds.get(`actives.${guildID}`).value()).write()
            db.guilds.get(`actives`).unset(guildID).write()
        }
    },



    checkGuilds () {

        bot.guilds.cache.map(guild => {
            this.checkGuild(guild.id)
        })
    },



    checkCommandArgs: {

        number: {
    
            type: (arg) => !isNaN(arg),
    
            return: (arg) => parseFloat(arg),
    
            //checkers
    
            min: (arg, min) => arg >= min,
    
            max: (arg, max) => arg <= max,
    
            int: (arg, int) => int ? Number.isInteger(parseFloat(arg)) : true
    
        },

        string: {

            type: (arg) => typeof arg === 'string' || arg instanceof String,

            return: (arg) => arg,

            //checkers

            equalsTo: (arg, equalsTo) => {

                if (typeof equalsTo === 'string') return arg === equalsTo
                else return equalsTo.includes(arg)
                  
            },

            length: (arg, length) => arg.length <= length

        },

        mention: {

            type: async (arg, msg) => {
                const match = arg.match(/<@!?(\d+)>/)?.[1]

                if (!match) return false
                try {
                    await msg.guild.members.fetch(match)
                }
                catch (e) { return false }

                return true
            },

            return: (arg, msg) => {

                const match = arg.match(/<@!?(\d+)>/)?.[1]
                return msg.guild.members.cache.get(match)
            }

        }

    }

}