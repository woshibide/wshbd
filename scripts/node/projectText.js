function renderProjectText(project, { collapsible = false } = {}) {
    if (collapsible) {
        const intro = project.intro?.trim() || project.title?.trim();
        const description = project.description?.trim();
        if (!intro && !description) return '';

        const preview = description ? `<span class="project-copy-preview" aria-hidden="true">${description.replace(/<[^>]*>/g, '')}</span>` : '';

        return `<details class="project-copy"><summary><span class="project-copy-title">${intro || 'Project details'}</span>${preview}</summary>${description ? `<div class="project-copy-body">${description}</div>` : ''}</details>`;
    }

    const paragraphs = [project.intro, project.description]
        .filter(value => typeof value === 'string' && value.trim())
        .map(value => `<span class="project-copy-paragraph">${value}</span>`)
        .join('');

    return paragraphs ? `<span class="project-copy">${paragraphs}</span>` : '';
}

module.exports = { renderProjectText };
