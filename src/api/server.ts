import '@tsed/swagger'

import process from 'node:process'

import { MikroORM, UseRequestContext } from '@mikro-orm/core'
import { Inject, PlatformAcceptMimesMiddleware, PlatformApplication } from '@tsed/common'
import { PlatformExpress } from '@tsed/platform-express'
import bodyParser from 'body-parser'
import { singleton } from 'tsyringe'

import * as controllers from '@/api/controllers'
import { Log } from '@/api/middlewares'
import { Database, PluginsManager, Store } from '@/services'

@singleton()
export class Server {

	@Inject() app: PlatformApplication

	orm: MikroORM

	constructor(
		private pluginsManager: PluginsManager,
		private store: Store,
		db: Database
	) {
		this.orm = db.orm
	}

	$beforeRoutesInit() {
		this.app
			.use(bodyParser.json())
			.use(bodyParser.urlencoded({ extended: true }))
			.use(Log)
			.use(PlatformAcceptMimesMiddleware)

		return null
	}

	@UseRequestContext()
	async start(): Promise<void> {
		const platform = await PlatformExpress.bootstrap(Server, {
			rootDir: __dirname,
			httpPort: Number.parseInt(process.env.API_PORT) || 4000,
			httpsPort: false,
			acceptMimes: ['application/json'],
			mount: {
				'/': [...Object.values(controllers), ...this.pluginsManager.getControllers()],
			},
			swagger: [
				{
					path: '/docs',
					specVersion: '3.0.1',
				},
			],
			logger: {
				level: 'warn',
				disableRoutesSummary: true,
			},
		})

		platform.listen().then(() => {
			this.store.update('ready', e => ({ ...e, api: true }))
		})
	}

}
