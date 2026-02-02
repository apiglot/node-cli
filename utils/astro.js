/**
 * Utility functions for Astro file handling
 */
import fs from 'fs/promises';
import path from 'path';

const AstroUtils = Object.freeze({
    async loadAstroConfig(){
        const module = await import(path.join(process.cwd(), 'astro.config.mjs'));
        // Use the module exports
        return module.default;
    },
    async extractRelevantContent(filePath) {
        // read file contents
        const data = await fs.readFile(filePath, 'utf8');
        // now, strip <style> and <script> tags and their content
        //let content = data.replace(/---[\s\S]+?---/gmsi, '');
        const styles = await this.extractStyleBlocks(filePath);
        let content = data.replace(/<style[\s\S]*?<\/style>/gmsi, '');
        
        //content = content.replace(/<script[\s\S]*?<\/script>/gmsi, '');
        return {
            content: content,
            removed: styles,
        };
    },
    async extractStyleBlocks(filePath) {
        try {
            // 1. Read the file content
            const content = await fs.readFile(filePath, 'utf8');

            // 2. Regex to match <style> tags and capture their inner content
            // <style[^>]*> matches the opening tag and any attributes (like is:global)
            // ([\s\S]*?) captures everything inside, including newlines, non-greedily
            // <\/style> matches the closing tag
            const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;

            const styles = [];
            let match;

            // 3. Iterate through all matches found in the file
            while ((match = styleRegex.exec(content)) !== null) {
                // match[1] refers to the first capturing group (the CSS content)
                styles.push(match[0]);
            }

            return styles;
        } catch (error) {
            console.error(`Error reading file at ${filePath}:`, error.message);
            return [];
        }
    }
});

export default AstroUtils;
