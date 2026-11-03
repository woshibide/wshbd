const mediaExtension =
  /\.(?:avif|webp|png|jpe?g|gif|svg|ico|mp4|webm|mov|m4v|ogv)$/i;
const fontExtension = /\.(?:ttf|otf|woff2?)$/i;

export function publicOriginal(file, visibleIds) {
  if (/^misc\/[^/]+$/.test(file))
    return mediaExtension.test(file) || fontExtension.test(file);
  if (file === "video/showreel-30fps.mp4") return true;
  const project = /^projects\/([^/]+)\//.exec(file);
  return Boolean(
    project && visibleIds.has(project[1]) && mediaExtension.test(file),
  );
}

export function nonPublicFile(file) {
  return (
    /(^|\/)(?:node_modules|build|src|tests|\.git)(\/|$)|(?:^|\/)\.env(?:\.[^/]*)?$|\.(?:pem|key)$/.test(
      file,
    ) ||
    /^content\/info\//.test(file) ||
    /^scripts\/(?:node|tests)\//.test(file) ||
    /^(?:AGENTS\.md|README\.md|package(?:-lock)?\.json|playwright\.config\.[^/]+|\.gitignore)$/.test(
      file,
    )
  );
}

export function projectOwners(value = []) {
  if (
    !Array.isArray(value) ||
    value.some((id) => typeof id !== "string" || !/^[A-Z]+\d+$/.test(id))
  )
    throw new Error("Invalid project asset ownership");
  return [...new Set(value)].sort();
}

export function privateRetirement(file, nextFiles, owners = []) {
  if (nonPublicFile(file)) return true;
  owners = projectOwners(owners);
  if (
    owners.length &&
    !owners.some((id) => nextFiles[`archive/${id}/index.html`])
  )
    return true;
  const media = /^content\/projects\/([^/]+)\//.exec(file);
  if (media && !nextFiles[`archive/${media[1]}/index.html`]) return true;
  return /^archive\/[A-Za-z]+\d+\/index\.html$/.test(file) && !nextFiles[file];
}
