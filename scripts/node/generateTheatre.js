const fs = require('fs')
const path = require('path')

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
            return `<video class="project-media" src="${mediaItem.path}" data-media='${JSON.stringify(mediaItem.list)}' data-media-index="${index}" autoplay muted loop playsinline controls preload="metadata" aria-label="${projectTitle}"></video>`
        }

        return `<img class="project-media" src="${mediaItem.path}" alt="${projectTitle}" loading="lazy" data-media='${JSON.stringify(mediaItem.list)}' data-media-index="${index}">`
    }

    function createProjectSections(projectsList, mediaMap) {
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
            <div class="project-section" id="${project.id}">
                <div class="project-image">
                    ${firstMediaElement}
                </div>
                <div class="text-columns">
                    <div id="gallery-info">
                        <a id="brand" href="/archive/${project.id}">${project.brand}</a>
                        <p id="title">${project.title}</p>
                        <p id="date">${project.date}</p>
                    </div>
                    <div class="empty-column"></div>
                    <div class="empty-column"></div>
                    <div id="gallery-counter-container">
                        <p id="gallery-counter">[1/${mediaList.length}]</p>
                    </div>
                </div>
            </div>
            `
            sectionsHtml += sectionHtml
        }

        return sectionsHtml
    }

    console.log('Generating project sections HTML...')
    let projectsList = [...archiveData.projects]
        .filter(project => project.shown === true)
        .reverse()
    let projectSectionsHtml = createProjectSections(projectsList, mediaMap)

    template = template.replace('<!-- PROJECT_SECTION_PLACEHOLDER -->', projectSectionsHtml)

    const outputPath = path.join(__dirname, '../../theatre/index.html')
    fs.writeFileSync(outputPath, template, 'utf8')

    console.log('HTML file generated successfully at', outputPath)

} catch (error) {
    console.error('Error during generation:', error.message)
}