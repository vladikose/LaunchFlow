import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

const IGNORE_PATTERNS = [
  'node_modules',
  '.git',
  '.cache',
  '.config',
  '.upm',
  'dist',
  '.replit',
  'replit.nix',
  '.breakpoints',
  'generated-icon.png',
  'package-lock.json'
];

function shouldIgnore(filePath: string): boolean {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function getAllFiles(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (shouldIgnore(relativePath)) continue;
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, baseDir));
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}

async function pushToGitHub() {
  const owner = 'anechkamapqpa-design';
  const repo = 'launchflow-platform';
  const branch = 'main';
  
  console.log('Connecting to GitHub...');
  const octokit = await getGitHubClient();
  
  console.log('Getting current user...');
  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);
  
  const workDir = process.cwd();
  const files = getAllFiles(workDir);
  console.log(`Found ${files.length} files to upload`);
  
  // Get or create the branch
  let baseSha: string | null = null;
  try {
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`
    });
    baseSha = ref.object.sha;
    console.log(`Branch ${branch} exists, SHA: ${baseSha}`);
  } catch (e: any) {
    console.log(`Branch ${branch} not found, will create initial commit...`);
  }
  
  // Create blobs for all files
  console.log('Creating file blobs...');
  const treeItems: any[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.join(workDir, file);
    
    try {
      const content = fs.readFileSync(fullPath);
      
      const { data: blob } = await octokit.git.createBlob({
        owner,
        repo,
        content: content.toString('base64'),
        encoding: 'base64'
      });
      
      treeItems.push({
        path: file,
        mode: '100644',
        type: 'blob',
        sha: blob.sha
      });
      
      if ((i + 1) % 50 === 0) {
        console.log(`  Uploaded ${i + 1}/${files.length} files...`);
      }
    } catch (e: any) {
      console.log(`  Skipped ${file}: ${e.message}`);
    }
  }
  
  console.log(`Creating tree with ${treeItems.length} files...`);
  const treeParams: any = {
    owner,
    repo,
    tree: treeItems
  };
  if (baseSha) {
    treeParams.base_tree = baseSha;
  }
  const { data: tree } = await octokit.git.createTree(treeParams);
  
  console.log('Creating commit...');
  const commitParams: any = {
    owner,
    repo,
    message: 'Sync from Replit - ' + new Date().toISOString(),
    tree: tree.sha,
    parents: baseSha ? [baseSha] : []
  };
  const { data: commit } = await octokit.git.createCommit(commitParams);
  
  if (baseSha) {
    console.log('Updating branch reference...');
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: commit.sha,
      force: true
    });
  } else {
    console.log('Creating branch reference...');
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: commit.sha
    });
  }
  
  console.log(`\nSuccess! Pushed to https://github.com/${owner}/${repo}`);
}

pushToGitHub().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
