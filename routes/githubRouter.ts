import { Hono } from "hono";

import { AddMemberToTeamsOptionsSchema } from "../integrations/github/types";
import { 
  GitHubAPIError, 
  GitHubUserNotFoundError, 
  GitHubPermissionError, 
  GitHubRateLimitError,
  GitHubTeamNotFoundError,
  GitHubValidationError
} from "../integrations/github/errorTypes";
import { githubManager } from "../integrations/github";
import {
  parsePRPayloadForDB,
  PRRawPayloadSchema,
} from "../integrations/github/events/helpers/githubApiParser";
import { Logger } from "../util/logger";

const githubRouter = new Hono();

// Helper function to handle GitHub API errors
function handleGitHubError(error: unknown, context: string) {
  Logger.log("error", `GitHub API error in ${context}`, { error });

  if (error instanceof GitHubUserNotFoundError) {
    return {
      message: error.message,
      error_code: error.githubErrorCode,
      status: 404
    };
  }
  
  if (error instanceof GitHubPermissionError) {
    return {
      message: error.message,
      error_code: error.githubErrorCode,
      status: 403
    };
  }
  
  if (error instanceof GitHubRateLimitError) {
    return {
      message: error.message,
      error_code: error.githubErrorCode,
      status: 429
    };
  }
  
  if (error instanceof GitHubTeamNotFoundError) {
    return {
      message: error.message,
      error_code: error.githubErrorCode,
      status: 404
    };
  }
  
  if (error instanceof GitHubValidationError) {
    return {
      message: error.message,
      error_code: error.githubErrorCode,
      status: 422
    };
  }

  if (error instanceof GitHubAPIError) {
    return {
      message: error.message || "GitHub API error occurred",
      error_code: error.githubErrorCode || "github_api_error",
      status: error.statusCode || 500
    };
  }

  // For unknown errors
  const errorMessage = error instanceof Error ? error.message : String(error);
  return {
    message: `Internal server error: ${errorMessage}`,
    error_code: "internal_error",
    status: 500
  };
}

githubRouter.get("/", (c) => {
  return c.text("Github Integration API");
});

githubRouter.get("/:username/status", async (c) => {
  const username = c.req.param("username");
  
  if (!username) {
    return c.json({
      message: "Username parameter is required",
      error_code: "missing_username"
    }, 400);
  }

  try {
    const isMember = await githubManager.isOrganizaionMember(username);
    return c.json({
      username,
      isMember,
      organization: process.env.GH_ORG_NAME || "organization"
    });
  } catch (error) {
    const errorResponse = handleGitHubError(error, `checking membership status for ${username}`);
    return c.json(errorResponse, errorResponse.status as any);
  }
});

githubRouter.post("/:username/invite", async (c) => {
  const username = c.req.param("username");
  
  if (!username) {
    return c.json({
      message: "Username parameter is required",
      error_code: "missing_username"
    }, 400);
  }

  try {
    await githubManager.inviteToOrganization(username);
    return c.json({
      message: "Invitation sent successfully",
      username,
      organization: process.env.GH_ORG_NAME || "organization"
    });
  } catch (error) {
    const errorResponse = handleGitHubError(error, `inviting ${username} to organization`);
    return c.json(errorResponse, errorResponse.status as any);
  }
});

githubRouter.post("/:username/remove", async (c) => {
  const username = c.req.param("username");
  
  if (!username) {
    return c.json({
      message: "Username parameter is required",
      error_code: "missing_username"
    }, 400);
  }

  try {
    await githubManager.removeFromOrganization(username);
    return c.json({
      message: "User removed successfully",
      username,
      organization: process.env.GH_ORG_NAME || "organization"
    });
  } catch (error) {
    const errorResponse = handleGitHubError(error, `removing ${username} from organization`);
    return c.json(errorResponse, errorResponse.status as any);
  }
});

githubRouter.put("/:username/teams", async (c) => {
  const username = c.req.param("username");
  
  if (!username) {
    return c.json({
      message: "Username parameter is required",
      error_code: "missing_username"
    }, 400);
  }

  try {
    const body = await c.req.json();
    const parseResult = AddMemberToTeamsOptionsSchema.safeParse(body);
    
    if (!parseResult.success) {
      return c.json({
        message: "Invalid request body",
        error_code: "validation_error",
        validation_errors: parseResult.error.errors
      }, 422);
    }

    await githubManager.addMemberToTeams(username, parseResult.data);
    return c.json({
      message: "User added to teams successfully",
      username,
      teams: parseResult.data.map(team => team.name)
    });
  } catch (error) {
    const errorResponse = handleGitHubError(error, `adding ${username} to teams`);
    return c.json(errorResponse, errorResponse.status as any);
  }
});

githubRouter.get("/connect", async (c) => {
  try {
    const url = await githubManager.initiateDeviceFlow();
    return c.json({ 
      url,
      message: "Device flow initiated successfully"
    });
  } catch (error) {
    const errorResponse = handleGitHubError(error, "initiating device flow");
    return c.json(errorResponse, errorResponse.status as any);
  }
});

githubRouter.post("/events", async (c) => {
  try {
    const body = await c.req.json();
    const cleanedBody = PRRawPayloadSchema.safeParse(body);
    
    if (!cleanedBody.success) {
      Logger.log("warn", "Invalid PR Payload received", { 
        errors: cleanedBody.error.errors 
      });
      
      return c.json({
        message: "Invalid pull request payload",
        error_code: "validation_error",
        validation_errors: cleanedBody.error.errors
      }, 422);
    }

    const eventData = parsePRPayloadForDB(cleanedBody.data);
    await githubManager.getEventManager().processEvent(eventData);
    
    return c.json({ 
      message: "Event processed successfully",
      event_type: "pull_request",
      author: eventData.author
    });
     } catch (error) {
     const errorResponse = handleGitHubError(error, "processing GitHub webhook event");
     return c.json(errorResponse, errorResponse.status as any);
   }
});

export default githubRouter;
