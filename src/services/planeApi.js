const axios = require("axios");
const config = require("../config/config");
const FormData = require("form-data");
const logger = require("../utils/logger");

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// File type mappings
const FILE_ICONS = {
  // Document types
  pdf: "📄",
  doc: "📝",
  docx: "📝",
  xls: "📊",
  xlsx: "📊",
  ppt: "📊",
  pptx: "📊",
  txt: "📝",
  rtf: "📝",
  // Image types
  jpg: "🖼️",
  jpeg: "🖼️",
  png: "🖼️",
  gif: "🖼️",
  bmp: "🖼️",
  webp: "🖼️",
  // Archive types
  zip: "📦",
  rar: "📦",
  "7z": "📦",
  tar: "📦",
  gz: "📦",
  // Code types
  js: "📜",
  jsx: "📜",
  ts: "📜",
  tsx: "📜",
  py: "📜",
  java: "📜",
  cpp: "📜",
  cs: "📜",
  html: "📜",
  css: "📜",
  // Other types
  md: "📑",
  json: "📑",
  xml: "📑",
  yaml: "📑",
  yml: "📑",
};

const MIME_TYPES = {
  // Document types
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  rtf: "application/rtf",
  // Image types
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  // Archive types
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  "7z": "application/x-7z-compressed",
  tar: "application/x-tar",
  gz: "application/gzip",
  // Code types
  js: "text/javascript",
  jsx: "text/javascript",
  ts: "text/typescript",
  tsx: "text/typescript",
  py: "text/x-python",
  java: "text/x-java-source",
  cpp: "text/x-c++src",
  cs: "text/x-csharp",
  html: "text/html",
  css: "text/css",
  // Other types
  md: "text/markdown",
  json: "application/json",
  xml: "application/xml",
  yaml: "application/yaml",
  yml: "application/yaml",
};

/**
 * @typedef {Object} PlaneIssue
 * @property {string} id
 * @property {string} name
 * @property {string} description_html
 * @property {string} description_stripped
 * @property {string} priority
 * @property {string} state
 * @property {string[]} labels
 * @property {string} created_at
 * @property {string} updated_at
 * @property {number} sequence_id
 */

/**
 * @typedef {Object} PlaneAttachment
 * @property {string} id
 * @property {Object} attributes
 * @property {string} attributes.name
 * @property {number} attributes.size
 * @property {string} attributes.type
 */

/**
 * @typedef {Object} PlaneResponse
 * @property {number} total_count
 * @property {string} next_cursor
 * @property {string} prev_cursor
 * @property {boolean} next_page_results
 * @property {boolean} prev_page_results
 * @property {number} count
 * @property {number} total_pages
 * @property {number} total_results
 * @property {PlaneIssue[]} results
 */

/**
 * @typedef {Object} PlaneProject
 * @property {string} id
 * @property {string} identifier
 * @property {string} name
 */

const planeApi = axios.create({
  baseURL: "https://api.plane.so/api/v1",
  headers: {
    "X-API-Key": config.PLANE_API_KEY,
    "Content-Type": "application/json",
  },
});

class PlaneService {
  /**
   * Create a PlaneService instance for a specific workspace and project.
   * @param {string} workspaceSlug - The workspace slug
   * @param {string} projectId - The project ID
   */
  constructor(workspaceSlug, projectId) {
    if (!workspaceSlug || !projectId) {
      throw new Error("workspaceSlug and projectId are required");
    }

    this.workspaceSlug = workspaceSlug;
    this.projectId = projectId;

    // Maintain backward compatibility with existing code that uses this.config
    this.config = {
      WORKSPACE_SLUG: workspaceSlug,
      PROJECT_ID: projectId,
    };

    // Instance-specific caches
    this.statesCache = null;
    this.labelsCache = null;
    this.projectCache = null;

    logger.debug("PlaneService instance created", {
      workspace: workspaceSlug,
      project: projectId,
    });
  }

  async getStates() {
    if (this.statesCache) {
      logger.debug("Returning states from cache");
      return this.statesCache;
    }

    try {
      logger.debug("Fetching states from API");
      const response = await planeApi.get(
        `/workspaces/${this.workspaceSlug}/projects/${this.projectId}/states/`
      );

      if (!response.data || !response.data.results) {
        logger.error("Invalid states response", { response: response.data });
        return {};
      }

      this.statesCache = response.data.results.reduce((acc, state) => {
        acc[state.id] = {
          name: state.name,
          color: state.color,
          group: state.group,
          sequence: state.sequence,
          description: state.description,
          is_default: state.default,
        };
        return acc;
      }, {});
      logger.debug("States cached successfully", {
        count: Object.keys(this.statesCache).length,
      });
      return this.statesCache;
    } catch (error) {
      logger.error("Error fetching states", error);
      return {};
    }
  }

  async getLabels() {
    if (this.labelsCache) {
      logger.debug("Returning labels from cache");
      return this.labelsCache;
    }

    try {
      logger.debug("Fetching labels from API");
      const response = await planeApi.get(
        `/workspaces/${this.workspaceSlug}/projects/${this.projectId}/labels`
      );
      if (!response.data || !response.data.results) {
        logger.error("Invalid labels response", { response: response.data });
        return {};
      }
      this.labelsCache = response.data.results.reduce((acc, label) => {
        acc[label.id] = {
          name: label.name,
          color: label.color,
        };
        return acc;
      }, {});
      logger.debug("Labels cached successfully", {
        count: Object.keys(this.labelsCache).length,
      });
      return this.labelsCache;
    } catch (error) {
      logger.error("Error fetching labels", error);
      return {};
    }
  }

  /**
   * Get project details
   * @returns {Promise<PlaneProject>}
   */
  async getProjectDetails() {
    if (this.projectCache) {
      logger.debug("Returning project details from cache");
      return this.projectCache;
    }

    try {
      logger.debug("Fetching project details from API");
      const response = await planeApi.get(
        `/workspaces/${this.workspaceSlug}/projects/${this.projectId}/`
      );
      this.projectCache = response.data;
      logger.debug("Project details cached successfully", {
        identifier: this.projectCache.identifier,
        name: this.projectCache.name,
      });
      return this.projectCache;
    } catch (error) {
      logger.error("Error fetching project details", error);
      throw error;
    }
  }

  /**
   * Format issue ID with project identifier
   * @param {number} sequenceId
   * @returns {Promise<string>}
   */
  async formatIssueId(sequenceId) {
    const project = await this.getProjectDetails();
    return `${project.identifier}-${sequenceId}`;
  }

  /**
   * Format the issue data with additional details
   * @param {PlaneIssue} issue
   * @param {Object} states
   * @param {Object} labels
   * @returns {Object}
   */
  formatIssueData(issue, states, labels) {
    logger.debug("Formatting issue data", { issueId: issue.id });
    return {
      ...issue,
      state_detail: states[issue.state] || {
        name: "Unknown",
        group: "Unknown",
      },
      label_details: issue.labels
        .map((id) => labels[id])
        .filter((label) => label),
      description: issue.description_stripped || issue.description_html || "",
    };
  }

  async getAllIssues(filters = {}) {
    try {
      logger.info("Fetching all issues", { filters });
      const [states, labels, project] = await Promise.all([
        this.getStates(),
        this.getLabels(),
        this.getProjectDetails(),
      ]);

      const queryParams = new URLSearchParams({
        per_page: "10", // Maximum allowed
        ...filters,
      });
      // Add filters if provided
      if (filters.state)
        queryParams.append("state__name__icontains", filters.state);
      if (filters.priority) queryParams.append("priority", filters.priority);

      // Add sorting
      queryParams.append("order_by", "-created_at"); // Sort by creation date, newest first

      const response = await planeApi.get(
        `/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/?${queryParams.toString()}`
      );

      if (!response.data || !Array.isArray(response.data.results)) {
        logger.warn("No issues found or invalid response", {
          response: response.data,
        });
        return [];
      }

      const enhancedResults = response.data.results.map((issue) => ({
        ...this.formatIssueData(issue, states, labels, project),
        formatted_id: `${project.identifier}-${issue.sequence_id}`,
      }));

      logger.info("Issues fetched successfully", {
        count: enhancedResults.length,
      });
      return {
        ...response.data,
        results: enhancedResults,
      };
    } catch (error) {
      logger.error("Error fetching all issues", error);
      return [];
    }
  }

  async createIssue(title, description, priority) {
    try {
      logger.info("Creating new issue", { title, priority });
      const response = await planeApi.post(
        `/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/`,
        {
          name: title,
          description_html: `<p class="editor-paragraph-block">${description}</p>`,
          priority,
        }
      );
      logger.info("Issue created successfully", {
        issueId: response.data.id,
        sequenceId: response.data.sequence_id,
      });
      return response.data;
    } catch (error) {
      logger.error("Error creating issue", error);
      throw error;
    }
  }

  /**
   * Get a single issue by ID
   * @param {string} issueId
   * @returns {Promise<Object>}
   */
  async getIssueById(issueId) {
    try {
      logger.debug("Fetching issue by ID", { issueId });
      const [issue, states, labels, attachments, project] = await Promise.all([
        planeApi.get(
          `/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/${issueId}/`
        ),
        this.getStates(),
        this.getLabels(),
        this.getIssueAttachments(issueId),
        this.getProjectDetails(),
      ]);

      const formattedIssue = {
        ...this.formatIssueData(issue.data, states, labels),
        attachments: attachments,
        formatted_id: `${project.identifier}-${issue.data.sequence_id}`,
      };
      logger.debug("Issue fetched successfully", {
        issueId,
        hasAttachments: attachments.length > 0,
      });
      return formattedIssue;
    } catch (error) {
      logger.error("Error fetching issue by ID", error);
      throw error;
    }
  }

  /**
   * Get issue attachments
   * @param {string} issueId
   * @returns {Promise<PlaneAttachment[]>}
   */
  async getIssueAttachments(issueId) {
    try {
      logger.debug("Fetching issue attachments", { issueId });
      const response = await planeApi.get(
        `/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/${issueId}/issue-attachments/`
      );

      const attachments = Array.isArray(response.data) ? response.data : [];
      logger.debug("Attachments fetched successfully", {
        issueId,
        count: attachments.length,
      });
      return attachments;
    } catch (error) {
      logger.error("Error fetching attachments", error);
      return [];
    }
  }

  /**
   * Get issue by sequence ID
   * @param {string} sequenceId
   * @returns {Promise<Object>}
   */
  async getIssueBySequenceId(sequenceId) {
    try {
      logger.info("Fetching issue by sequence ID", { sequenceId });
      const [issue, states, labels, project] = await Promise.all([
        planeApi.get(`/workspaces/${this.workspaceSlug}/issues/${sequenceId}/`),
        this.getStates(),
        this.getLabels(),
        this.getProjectDetails(),
      ]);
      const attachments = await this.getIssueAttachments(issue.data.id);
      const formattedIssue = {
        ...this.formatIssueData(issue.data, states, labels),
        attachments: attachments,
        formatted_id: `${project.identifier}-${issue.data.sequence_id}`,
      };
      logger.info("Issue fetched successfully", {
        sequenceId,
        issueId: issue.data.id,
        hasAttachments: attachments.length > 0,
      });
      return formattedIssue;
    } catch (error) {
      logger.error("Error fetching issue by sequence ID", error);
      throw error;
    }
  }

  // File utility methods
  getFileIcon(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    return FILE_ICONS[ext] || "📎";
  }

  getContentType(filename) {
    const ext = filename.split(".").pop().toLowerCase();
    return MIME_TYPES[ext] || "application/octet-stream";
  }

  formatFileSize(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  validateFileSize(size) {
    if (size > MAX_FILE_SIZE) {
      const error = new Error(
        `File size (${this.formatFileSize(
          size
        )}) exceeds maximum allowed size of ${this.formatFileSize(
          MAX_FILE_SIZE
        )}`
      );
      logger.error("File size validation failed", {
        size,
        maxSize: MAX_FILE_SIZE,
        formattedSize: this.formatFileSize(size),
        formattedMaxSize: this.formatFileSize(MAX_FILE_SIZE),
      });
      throw error;
    }
    return true;
  }

  /**
   * Upload a file to an issue using Plane's three-step upload process
   * @param {string} issueId
   * @param {Buffer} fileBuffer
   * @param {string} fileName
   * @param {string} contentType
   * @returns {Promise<PlaneAttachment>}
   */
  async uploadFileToIssue(issueId, fileBuffer, fileName, contentType) {
    try {
      logger.info("Starting file upload process", {
        issueId,
        fileName,
        contentType,
        fileSize: fileBuffer.length,
      });

      // Input validation
      if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
        throw new Error("Invalid file buffer provided");
      }
      if (!fileName || typeof fileName !== "string") {
        throw new Error("Invalid file name provided");
      }
      if (!contentType || typeof contentType !== "string") {
        throw new Error("Invalid content type provided");
      }

      this.validateFileSize(fileBuffer.length);

      // Step 1: Get upload credentials
      logger.debug("Getting upload credentials");
      let uploadCredentialsResponse;
      try {
        // Create a direct axios request to match curl command
        uploadCredentialsResponse = await axios({
          method: "post",
          url: `https://api.plane.so/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/${issueId}/issue-attachments/`,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.PLANE_API_KEY,
          },
          data: {
            name: fileName,
            size: fileBuffer.length,
            type: contentType,
          },
        });
      } catch (error) {
        logger.error("Upload credentials error", error);
        if (error.response?.status === 404) {
          throw new Error("Issue not found");
        }
        if (error.response?.status === 413) {
          throw new Error("File size too large");
        }
        throw new Error(
          "Failed to get upload credentials: " +
            (error.response?.data?.error || error.message)
        );
      }

      const { upload_data, asset_id } = uploadCredentialsResponse.data;
      if (!upload_data || !asset_id) {
        throw new Error("Invalid upload credentials received from server");
      }

      // Step 2: Upload file to S3
      logger.debug("Uploading file to storage", {
        uploadUrl: upload_data.url,
        assetId: asset_id,
      });
      const formData = new FormData();
      // Add required S3 fields in specific order
      formData.append("Content-Type", contentType);
      formData.append("key", upload_data.fields.key);
      formData.append("x-amz-algorithm", upload_data.fields["x-amz-algorithm"]);
      formData.append(
        "x-amz-credential",
        upload_data.fields["x-amz-credential"]
      );
      formData.append("x-amz-date", upload_data.fields["x-amz-date"]);
      formData.append("policy", upload_data.fields.policy);
      formData.append("x-amz-signature", upload_data.fields["x-amz-signature"]);
      // File must be the last field
      formData.append("file", fileBuffer, {
        filename: fileName,
        contentType: contentType,
      });

      try {
        await axios.post(upload_data.url, formData, {
          headers: {
            ...formData.getHeaders(),
            "Content-Type": "multipart/form-data",
          },
        });
      } catch (error) {
        logger.error("Storage upload error", error);
        throw new Error(
          "Failed to upload file to storage: " +
            (error.response?.data?.error || error.message)
        );
      }

      // Step 3: Complete the upload
      logger.debug("Completing upload process", { asset_id });
      try {
        const completeResponse = await axios({
          method: "patch",
          url: `https://api.plane.so/api/v1/workspaces/${this.workspaceSlug}/projects/${this.projectId}/issues/${issueId}/issue-attachments/${asset_id}`,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.PLANE_API_KEY,
          },
        });
        logger.info("File upload completed successfully", {
          issueId,
          fileName,
          asset_id,
        });
        return completeResponse.data;
      } catch (error) {
        logger.error("Complete upload error", error);
        throw new Error(
          "Failed to complete upload: " +
            (error.response?.data?.error || error.message)
        );
      }
    } catch (error) {
      logger.error("File upload failed", error);
      throw error;
    }
  }
}

// Export the class itself (not an instance) to support multiple instances
module.exports = PlaneService;
