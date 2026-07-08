import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const projectsJsonPath = path.join(rootDir, 'data', 'projects', 'projects.json');
const profileJsonPath = path.join(rootDir, 'data', 'projects', 'profile.json');
const templatePath = path.join(rootDir, 'README.template.md');
const readmePath = path.join(rootDir, 'README.md');

function slugify(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function run() {
  try {
    // 1. Read profile.json
    const rawProfile = await fs.readFile(profileJsonPath, 'utf8');
    const profile = JSON.parse(rawProfile);

    // 2. Read projects.json
    const rawProjects = await fs.readFile(projectsJsonPath, 'utf8');
    const projects = JSON.parse(rawProjects);

    let projectsHtml = '';

    // 3. Process each project
    for (const project of projects) {
      const projectId = project.id;
      const projectDir = path.join(rootDir, 'data', 'projects', projectId);
      const webpPath = path.join(projectDir, 'gen.webp');
      const svgPath = path.join(projectDir, 'logo_with_corners.svg');

      let hasLogo = false;
      try {
        await fs.access(webpPath);
        hasLogo = true;
      } catch {
        console.warn(`Warning: gen.webp not found for project ${projectId}`);
      }

      if (hasLogo) {
        const imgBuffer = await fs.readFile(webpPath);
        const base64Img = imgBuffer.toString('base64');

        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <style>
    .corner {
      stroke: #d2c6a2;
      stroke-width: 2;
      fill: none;
    }
    @media (prefers-color-scheme: light) {
      .corner {
        stroke: #504945;
      }
    }
  </style>
  <image href="data:image/webp;base64,${base64Img}" x="6" y="6" width="148" height="148" />
  <rect x="6" y="6" width="148" height="148" fill="none" stroke="rgba(232, 228, 217, 0.15)" stroke-width="1" />
  <path d="M 0 16 L 0 0 L 16 0" class="corner" />
  <path d="M 144 0 L 160 0 L 160 16" class="corner" />
  <path d="M 0 144 L 0 160 L 16 160" class="corner" />
  <path d="M 160 144 L 160 160 L 144 160" class="corner" />
</svg>`;

        await fs.writeFile(svgPath, svgContent, 'utf8');
        console.log(`Generated ${svgPath}`);
      }

      const slug = slugify(project.title);
      const url = `https://melendo.dev/projects/${slug}/`;
      const techStackStr = project.stack.map(tech => `· ${tech}`).join(' &nbsp;');

      projectsHtml += `
---

<p><small><samp>${project.role.toUpperCase()}</samp></small></p>
${hasLogo ? `<img align="right" src="data/projects/${projectId}/logo_with_corners.svg" width="160" height="160" hspace="15" alt="${project.title}" />` : ''}
<h3><strong><samp>${project.title.toUpperCase()}</samp></strong></h3>

<p><samp>${project.description}</samp></p>

<p><samp>${techStackStr}</samp></p>
<a href="${url}">[<samp>Más información</samp>]</a>
<br clear="right" />
`;
    }

    // 4. Read template and inject profile and projects
    let templateContent = await fs.readFile(templatePath, 'utf8');
    
    // Replace placeholders
    templateContent = templateContent
      .replace('{{HEADLINE}}', profile.headline)
      .replace('{{ABOUT}}', profile.about)
      .replace('{{EMAIL}}', profile.email)
      .replace('{{LINKEDIN}}', profile.linkedin)
      .replace('{{GITHUB}}', profile.github)
      .replace('{{YOUTUBE}}', profile.youtube)
      .replace('<!-- PROJECTS -->', projectsHtml);

    // 5. Write final README.md
    await fs.writeFile(readmePath, templateContent, 'utf8');
    console.log(`Successfully updated ${readmePath}`);

  } catch (error) {
    console.error('Error compiling README:', error);
    process.exit(1);
  }
}

run();
