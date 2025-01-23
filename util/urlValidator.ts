
const githubUrl = "https://github.com/ubclaunchpad";

export function isValidGitHubLink(link: string): boolean {
    return link.startsWith(githubUrl) && link.length > githubUrl.length;
  }

export function extractOrgRepo(link: string): string {
  const prefix = githubUrl;
  if (!link.startsWith(prefix)) {
    throw new Error('Invalid GitHub URL');
  }
  
  const path = link.slice(prefix.length + 1); // +1 to remove leading slash

  
  return path;
}