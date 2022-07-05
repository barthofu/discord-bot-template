import { Client } from 'discordx'
import { container, injectable } from 'tsyringe'

import { Once, Discord, Schedule } from '@decorators'
import { Database, Logger, Scheduler } from '@services'
import { Data } from '@entities'
import { syncAllGuilds } from '@utils/functions'

import { generalConfig, logsConfig } from '@config'

@Discord()
@injectable()
export default class ReadyEvent {

    constructor(
        private db: Database,
        private logger: Logger,
        private scheduler: Scheduler
    ) {}

    private activityIndex = 0

    @Once('ready')
    async readyHandler([client]: [Client]) {

        // make sure all guilds are cached
        await client.guilds.fetch()

        // synchronize applications commands with Discord
        await client.initApplicationCommands({
            global: {
                log: logsConfig.debug,
                disable: {
                    delete: false
                }
            },
            guild: {
                log: logsConfig.debug
            }
        })

        // synchronize applications command permissions with Discord
        /**
         * ************************************************************
         * Discord has deprecated permissions v1 api in favour permissions v2, await future updates
         * see https://github.com/discordjs/discord.js/pull/7857
         * ************************************************************
         */
        //await client.initApplicationPermissions(false)

        // change activity
        await this.changeActivity()

        // update last startup time in the database
        await this.db.getRepo(Data).set('lastStartup', Date.now())

        // start scheduled jobs
        this.scheduler.startAllJobs()

        // log startup
        await this.logger.logStartingConsole()

        // syncrhonize guilds between discord and the database
        await syncAllGuilds(client)
    }

    @Schedule('*/15 * * * * *') // each 15 seconds
    async changeActivity() {

        const client = container.resolve(Client)
        const activity = generalConfig.activities[this.activityIndex]
        
        activity.text = eval(`new String(\`${activity.text}\`).toString()`)
            
        if (activity.type === 'STREAMING') {
            //streaming activity
            
            client.user?.setStatus('online')
            client.user?.setActivity(activity.text, {
                'url': 'https://www.twitch.tv/discord',
                'type': 'STREAMING'
            })
        } else {
            //other activities
            
            client.user?.setActivity(activity.text, {
                type: activity.type as 'PLAYING' | 'WATCHING' | 'LISTENING' | 'STREAMING'
            })
        }

        this.activityIndex++
        if (this.activityIndex === generalConfig.activities.length) this.activityIndex = 0

    }
}