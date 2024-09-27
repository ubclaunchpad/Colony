import { Hono } from 'hono'
import { z } from 'zod'
import { OrganizationGithubManager, setupGithubUserForOrg } from "./util/github"
import { discordServer } from "./util/discord"

const app = new Hono()

const privateKey = process.env.GH_KEY!
const appId = process.env.GH_APP_ID!
const orgClientId = process.env.GH_CLIENT_ID!
const orgAppId = process.env.GH_ORG_APP_ID!
const orgName = process.env.GH_ORG_NAME!

const githubManager = new OrganizationGithubManager({
  appId: appId,
  privateKey: privateKey,
  orgName: orgName,
  orgAppId: parseInt(orgAppId),
  orgClientId: orgClientId,
})

app.get('/', (c) => {
  return c.text('Launch Pad Colony Engine API')
})

type GithubTeam = {
  name: string
  role: "maintainer" | "member"
}

const GithubIntegrationSchema = z.object({
  githubUsername: z.string(),
  actions: z.object({
    teams: z.array(
      z.object({
        name: z.string(),
        role: z.enum(["maintainer", "member"]),
      })
    ),
  }),
})

app.post('/colony/integrations/github', async (c) => {
  try {
    const body = await c.req.json()
    const parseResult = GithubIntegrationSchema.safeParse(body)
    if (parseResult.success) {
      try {
        await setupGithubUserForOrg({
          manager: githubManager,
          options: parseResult.data,
        })
        return c.text('All actions completed successfully', 200)
      } catch (e) {
        console.warn(e)
        return c.text((e as Error).message, 400)
      }
    } else {
      return c.json(parseResult.error.errors, 400)
    }
  } catch (e) {
    console.warn(e)
    return c.text('Internal server error', 500)
  }
})

const DiscordIntegrationSchema = z.object({
  discordUsername: z.string(),
  actions: z.object({
    roles: z.array(z.string()),
  }),
})

app.post('/colony/integrations/discord', async (c) => {
  try {
    const body = await c.req.json()
    const parseResult = DiscordIntegrationSchema.safeParse(body)
    if (parseResult.success) {
      try {
        await discordServer.addRolesToUser(
          parseResult.data.discordUsername,
          parseResult.data.actions.roles
        )
        return c.text('All roles added successfully', 200)
      } catch (e) {
        return c.text((e as Error).message, 400)
      }
    } else {
      return c.json(parseResult.error.errors, 400)
    }
  } catch (e) {
    console.warn(e)
    return c.text('Internal server error', 500)
  }
})

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}