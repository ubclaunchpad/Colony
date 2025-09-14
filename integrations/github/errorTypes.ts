export class GitHubAPIError extends Error {
  public statusCode?: number;
  public githubErrorCode?: string;
  
  constructor(message: string, statusCode?: number, githubErrorCode?: string) {
    super(message);
    this.name = 'GitHubAPIError';
    this.statusCode = statusCode;
    this.githubErrorCode = githubErrorCode;
  }
}

export class GitHubUserNotFoundError extends GitHubAPIError {
  constructor(username: string) {
    super(`GitHub user '${username}' not found`, 404, 'user_not_found');
    this.name = 'GitHubUserNotFoundError';
  }
}

export class GitHubPermissionError extends GitHubAPIError {
  constructor(action: string) {
    super(`Insufficient permissions to ${action}`, 403, 'insufficient_permissions');
    this.name = 'GitHubPermissionError';
  }
}

export class GitHubRateLimitError extends GitHubAPIError {
  constructor() {
    super('GitHub API rate limit exceeded. Please try again later.', 429, 'rate_limit_exceeded');
    this.name = 'GitHubRateLimitError';
  }
}

export class GitHubTeamNotFoundError extends GitHubAPIError {
  constructor(teamName: string) {
    super(`GitHub team '${teamName}' not found`, 404, 'team_not_found');
    this.name = 'GitHubTeamNotFoundError';
  }
}

export class GitHubValidationError extends GitHubAPIError {
  constructor(message: string) {
    super(message, 422, 'validation_error');
    this.name = 'GitHubValidationError';
  }
}
