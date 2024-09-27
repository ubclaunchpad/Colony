import { Application, Router, Context } from "jsr:@oak/oak@17";
import { z } from "https://deno.land/x/zod/mod.ts";

import {
  OrganizationGithubManager,
  setupGithubUserForOrg,
} from "./util/github.ts";
import "jsr:@std/dotenv/load";
import { discordServer } from "./util/discord.ts";

const router = new Router();

const privateKey = Deno.env.get("GH_KEY")!;
const appId = Deno.env.get("GH_APP_ID")!;
const orgClientId = Deno.env.get("GH_CLIENT_ID")!;
const orgAppId = Deno.env.get("GH_ORG_APP_ID")!;
const orgName = Deno.env.get("GH_ORG_NAME")!;

const githubManager = new OrganizationGithubManager({
  appId: appId,
  privateKey: privateKey,
  orgName: orgName,
  orgAppId: parseInt(orgAppId),
  orgClientId: orgClientId,
});

router.get("/", (ctx: Context) => {
  ctx.response.body = "Launch Pad Colony Engine API";
});

type GithubTeam = {
  name: string;
  role: "maintainer" | "member";
};

const GithubIntegrationSchema = z.object({
  githubUsername: z.string(),
  actions: z.object({
    // followOrganization: z.boolean(),
    // starRepositories: z.array(z.string()),
    // watchRepositories: z.array(z.string()),
    teams: z.array(
      z.object({
        name: z.string(),
        role: z.enum(["maintainer", "member"]),
      })
    ),
  }),
});

router.post("/colony/integrations/github", async (ctx: Context) => {
  try {
    const queryObj = await ctx.request.body.json();
    const parseResult = GithubIntegrationSchema.safeParse(queryObj);
    if (parseResult.success) {
      try {
        await setupGithubUserForOrg({
          manager: githubManager,
          options: parseResult.data,
        });
        ctx.response.status = 200;
        ctx.response.body = "All actions completed successfully";
      } catch (e) {
        ctx.response.status = 400;
        const error = e as Error;
        ctx.response.body = error.message;
      }
    } else {
      ctx.response.status = 400;
      ctx.response.body = parseResult.error.errors;
    }
  } catch (e) {
    console.warn(e);
    ctx.response.status = 500;
  }
});

const DiscordIntegrationSchema = z.object({
  discordUsername: z.string(),
  actions: z.object({
    roles: z.array(z.string()),
  }),
});

router.post("/colony/integrations/discord", async (ctx: Context) => {
  try {
    const queryObj = await ctx.request.body.json();
    const parseResult = DiscordIntegrationSchema.safeParse(queryObj);
    if (parseResult.success) {
      try {
        await discordServer.addRolesToUser(
          parseResult.data.discordUsername,
          parseResult.data.actions.roles
        );
      } catch (e) {
        ctx.response.status = 400;
        const error = e as Error;
        ctx.response.body = error.message;
        return;
      }
      ctx.response.status = 200;
      ctx.response.body = "All roles added successfully";
    } else {
      ctx.response.status = 400;
      ctx.response.body = parseResult.error.errors;
    }
    ctx.response.status = 200;
  } catch (e) {
    console.warn(e);
    ctx.response.status = 500;
    ctx.response.body = "Internal server error";
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8080 });

// router.get("/colony/integrations/github", async (ctx: Context) => {
//   try {
//     const queryObj = JSON.parse(
//       decodeURIComponent(ctx.request.url.search.split("?")[1])
//     );
//     const parseResult = GithubIntegrationSchema.safeParse(queryObj);
//     if (parseResult.success) {
//       const data = await githubManager.initiateDeviceFlow();
//       const user_code = data.user_code;
//       const verification_uri = data.verification_uri;
//       const replacements = {
//         "${verification_uri}": verification_uri,
//         "${user_code}": user_code,
//         // Add more placeholders and values as needed
//       };
//       const file = Deno.readTextFileSync("./pages/githubAuth.html");
//       const replaced = file.replace(
//         /\${verification_uri}|\${user_code}/g,
//         (match) => replacements[match]
//       );
//       ctx.response.body = replaced;

//       ctx.response.status = 200;
//     } else {
//       ctx.response.status = 400;
//       ctx.response.body = parseResult.error.errors;
//     }
//   } catch (e) {
//     console.log(e);

//     ctx.response.status = 500;
//   }
// });
