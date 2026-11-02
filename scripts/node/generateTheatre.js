const fs = require('fs')
const path = require('path')
const { renderProjectText } = require('./projectText')

const archivePath = path.join(__dirname, '../../content/info/archive.json')
const mediaMapPath = path.join(__dirname, '../../content/info/media-map.json')

const videoMimeTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.m4v': 'video/mp4',
    '.ogv': 'video/ogg'
}

function isVideoFile(fileName) {
    return Boolean(videoMimeTypes[path.extname(fileName).toLowerCase()])
}

function getMediaPath(projectId, fileName) {
    return `/content/projects/${projectId}/${fileName}`
}

console.log('Reading JSON files...')

try {
    const archiveData = JSON.parse(fs.readFileSync(archivePath, 'utf8'))
    const mediaMap = JSON.parse(fs.readFileSync(mediaMapPath, 'utf8'))

    console.log('JSON files read successfully.')

    const templatePath = path.join(__dirname, 'templates/theatre_template.html')
    let template = fs.readFileSync(templatePath, 'utf8')

    console.log('Template file read successfully.')

    function createMediaElement(projectTitle, mediaItem, index) {
        if (mediaItem.type === 'video') {
            return `<video class="project-media" src="${mediaItem.path}" data-media='${JSON.stringify(mediaItem.list)}' data-media-index="${index}" autoplay muted loop playsinline preload="metadata" aria-label="${projectTitle}"></video>`
        }

        return `<img class="project-media" src="${mediaItem.path}" alt="${projectTitle}" loading="lazy" data-media='${JSON.stringify(mediaItem.list)}' data-media-index="${index}">`
    }

    function createProjectSections(projectsList, mediaMap, copyIndex) {
        let sectionsHtml = ''

        for (let project of projectsList) {
            let mediaFiles = mediaMap[project.id] || []
            let mediaList = mediaFiles.map(fileName => {
                return {
                    path: getMediaPath(project.id, fileName),
                    type: isVideoFile(fileName) ? 'video' : 'image'
                }
            })

            if (!mediaList.length) {
                mediaList = [{ path: '/content/misc/non-image.svg', type: 'image' }]
            }

            const firstMediaIndex = 0
            const firstMedia = {
                ...mediaList[firstMediaIndex],
                list: mediaList
            }
            const firstMediaElement = createMediaElement(project.title, firstMedia, firstMediaIndex)

            // create project sections
            let sectionHtml = `
            <div class="project-section" id="${project.id}${copyIndex ? '-loop' : ''}" data-project-id="${project.id}">
                <div class="project-image">
                    ${firstMediaElement}
                </div>
                <div class="text-columns">
                    <div id="gallery-info">
                        <a id="brand" href="/archive/${project.id}">${project.brand}</a>
                        <div class="gallery-info-details">
                            <p id="title">${project.title}</p>
                            <p id="gallery-counter">IMAGE 1 OUT OF ${mediaList.length}</p>
                            <p id="date">${project.date}</p>
                        </div>
                    </div>
                    ${renderProjectText(project, { collapsible: true })}
                </div>
            </div>
            `
            sectionsHtml += sectionHtml.trimEnd()
        }

        return sectionsHtml.trim()
    }

    console.log('Generating project sections HTML...')
    let projectsList = [...archiveData.projects]
        .filter(project => project.shown === true && project.selection === true)
        .reverse()
    const projectSectionsHtml = [0, 1].map(copyIndex => `
        <div class="project-sequence">
            ${createProjectSections(projectsList, mediaMap, copyIndex)}
        </div>
    `.trim()).join('\n')

    template = template.replace('<!-- PROJECT_SECTION_PLACEHOLDER -->', projectSectionsHtml)

    const outputPath = path.join(__dirname, '../../theatre/index.html')
    fs.writeFileSync(outputPath, template, 'utf8')

    console.log('HTML file generated successfully at', outputPath)

} catch (error) {
    console.error('Error during generation:', error.message)
}
