const baseGithubURL = "https://github.com/";
const githubUrl = `${baseGithubURL}ubclaunchpad`;

export function isValidGitHubLink(link: string): boolean {
  return link.startsWith(githubUrl) && link.length > githubUrl.length;
}

export function extractOrgRepo(link: string): string {
  const prefix = baseGithubURL;
  if (!link.startsWith(prefix)) {
    throw new Error("Invalid GitHub URL");
  }

  const path = link.slice(prefix.length);
  return path;
}
