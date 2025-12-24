import { createRepository, getGitHubUsername } from '../server/github';
import { execSync } from 'child_process';

async function pushToGitHub() {
  const repoName = 'launchflow-platform';
  const description = 'LaunchFlow - Product Launch Management Platform';
  
  try {
    console.log('Getting GitHub username...');
    const username = await getGitHubUsername();
    console.log(`GitHub username: ${username}`);
    
    console.log(`Creating repository: ${repoName}...`);
    const repo = await createRepository(repoName, description, false);
    console.log(`Repository created: ${repo.html_url}`);
    
    console.log('Configuring git remote...');
    try {
      execSync('git remote remove github', { stdio: 'pipe' });
    } catch (e) {
    }
    
    const remoteUrl = `https://github.com/${username}/${repoName}.git`;
    execSync(`git remote add github ${remoteUrl}`, { stdio: 'inherit' });
    
    console.log('Pushing to GitHub...');
    execSync('git push -u github main', { stdio: 'inherit' });
    
    console.log(`\nSuccess! Repository available at: ${repo.html_url}`);
  } catch (error: any) {
    if (error.status === 422) {
      console.error(`Repository '${repoName}' already exists. Try a different name.`);
    } else {
      console.error('Error:', error.message || error);
    }
    process.exit(1);
  }
}

pushToGitHub();
