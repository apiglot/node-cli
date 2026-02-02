//const { execSync } = require('child_process');
import { exec } from 'child_process';
import { promisify } from 'util';
import { getFileInfo } from '../utils.js'

const execAsync = promisify(exec);

export async function isFileModified(filePath) {
  try {
    // --porcelain is perfect for scripts because the output is predictable
    const { stdout } = await execAsync(`git status --porcelain -- "${filePath}"`);
    
    // If stdout has content, the file is modified or untracked
    const status = stdout.trim();

    return status.length > 0;
    
    return {
      isDirty: status.length > 0,
      statusCode: status.slice(0, 2) || null, // e.g., " M", "M ", or "MM"
      path: filePath
    };
  } catch (error) {
    throw new Error(`Failed to check git status: ${error.message}`);
  }
}

export async function getLastModified(filePath) {
  try {
    const modified = await isFileModified(filePath);
    if(modified){
        // return actual last modified date from filesystem
        const fileInfo =  await getFileInfo(filePath);
        return {
            source: "filesystem",
            timestamp: fileInfo.mtime.toISOString()
        };
    }
    // The -1 flag limits output to the most recent commit for that file
    const command = `git log -1 --format=%cd --date=iso-strict -- "${filePath}"`;
    //console.log(command);
    const { stdout } = await execAsync(command);
    return {
        source: "git",
        timestamp: stdout.trim()
    }
  } catch (error) {
    return `Error: ${error.message}`;
  }
}
