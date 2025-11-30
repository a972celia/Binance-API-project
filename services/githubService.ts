
export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export const uploadFileToGitHub = async (
  content: string,
  filename: string,
  config: GitHubConfig
) => {
  // Prepend folder name to satisfy user request
  const path = `raw_data/${filename}`;
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
  
  // Robust Base64 encoding for UTF-8 content
  const contentEncoded = btoa(unescape(encodeURIComponent(content)));
  
  const body = {
    message: `Add ${filename} via Binance Analyzer App`,
    content: contentEncoded,
    // Note: If updating an existing file, 'sha' is required. 
    // Since we use timestamps in filenames, we assume new files (create mode).
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/vnd.github.v3+json',
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'GitHub Upload Failed');
  }

  return await response.json();
};
