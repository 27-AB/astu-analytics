const Research = require("../models/Research");

exports.getAll = async (req, res) => {
  try {
    const { status, college, department, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status)     query.status = status;
    if (college)    query.college = new RegExp(college, "i");
    if (department) query.department = new RegExp(department, "i");
    if (search)     query.$or = [
      { title: new RegExp(search, "i") },
      { lead:  new RegExp(search, "i") },
      { tags:  new RegExp(search, "i") },
    ];
    const projects = await Research.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .maxTimeMS(5000);
    const total = projects.length;
    res.json({ success: true, total, page: Number(page), projects });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const project = await Research.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, project });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadDate: new Date()
    })) : [];

    // Parse collaborators from JSON string if present
    let collaborators = [];
    if (req.body.collaborators) {
      try {
        collaborators = JSON.parse(req.body.collaborators);
      } catch (e) {
        console.error("Failed to parse collaborators:", e);
      }
    }

    const project = await Research.create({
      ...req.body,
      attachments,
      collaborators,
      createdBy: req.user.id,
      createdByName: req.user.name,
      lastModifiedBy: req.user.id,
      lastModifiedByName: req.user.name,
    });
    res.status(201).json({ success: true, project });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.update = async (req, res) => {
  try {
    const project = await Research.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Not found." });
    
    // Permission check: Admin can edit any, researcher can edit own or where they're high-priority collaborator
    const isOwner = project.createdBy && project.createdBy.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    
    // Check if user is a collaborator with high priority
    let collaboratorPriority = null;
    if (project.collaborators && project.collaborators.length > 0) {
      const collab = project.collaborators.find(c => c.userId && c.userId.toString() === req.user.id);
      if (collab) {
        collaboratorPriority = collab.priority;
      }
    }
    
    const isHighPriorityCollaborator = collaboratorPriority === "high";
    const canEdit = isAdmin || isOwner || isHighPriorityCollaborator;
    
    if (!canEdit) {
      return res.status(403).json({ 
        success: false, 
        message: collaboratorPriority 
          ? `Access denied. Only high-priority collaborators can edit. Your priority: ${collaboratorPriority}`
          : "Access denied. Only the owner, high-priority collaborators, or admins can edit this project.",
        owner: project.createdByName || "Unknown",
        yourRole: req.user.role,
        yourPriority: collaboratorPriority || "none"
      });
    }
    
    // Handle file attachments
    let attachments = project.attachments || [];
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadDate: new Date()
      }));
      attachments = [...attachments, ...newAttachments];
    }

    // Parse collaborators from JSON string if present
    let collaborators = project.collaborators || [];
    if (req.body.collaborators) {
      try {
        collaborators = JSON.parse(req.body.collaborators);
      } catch (e) {
        console.error("Failed to parse collaborators:", e);
        collaborators = project.collaborators || [];
      }
    }

    // Update project and track who modified it
    const updatedProject = await Research.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        attachments,
        collaborators,
        lastModifiedBy: req.user.id,
        lastModifiedByName: req.user.name,
      },
      { new: true, runValidators: true }
    );
    
    res.json({ 
      success: true, 
      project: updatedProject, 
      editedBy: req.user.name, 
      role: req.user.role,
      permission: isAdmin ? "admin" : isOwner ? "owner" : "high-priority collaborator"
    });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

// Add collaborator to project (only owner or admin can add)
exports.addCollaborator = async (req, res) => {
  try {
    const { userId, priority } = req.body;
    
    if (!userId || !priority) {
      return res.status(400).json({ 
        success: false, 
        message: "userId and priority are required" 
      });
    }
    
    if (!["high", "medium", "low"].includes(priority)) {
      return res.status(400).json({ 
        success: false, 
        message: "Priority must be 'high', 'medium', or 'low'" 
      });
    }
    
    const project = await Research.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    
    // Only owner or admin can add collaborators
    const isOwner = project.createdBy && project.createdBy.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Only the project owner or admin can add collaborators." 
      });
    }
    
    // Check if already a collaborator
    const existingCollab = project.collaborators.find(c => c.userId && c.userId.toString() === userId);
    if (existingCollab) {
      return res.status(400).json({ 
        success: false, 
        message: "User is already a collaborator. Use update endpoint to change priority." 
      });
    }
    
    // Add collaborator
    project.collaborators.push({ userId, priority });
    project.lastModifiedBy = req.user.id;
    project.lastModifiedByName = req.user.name;
    await project.save();
    
    res.json({ 
      success: true, 
      message: `Collaborator added with ${priority} priority`,
      project 
    });
  } catch (err) { 
    res.status(400).json({ success: false, message: err.message }); 
  }
};

// Update collaborator priority (only owner or admin)
exports.updateCollaborator = async (req, res) => {
  try {
    const { userId, priority } = req.body;
    
    if (!userId || !priority) {
      return res.status(400).json({ 
        success: false, 
        message: "userId and priority are required" 
      });
    }
    
    if (!["high", "medium", "low"].includes(priority)) {
      return res.status(400).json({ 
        success: false, 
        message: "Priority must be 'high', 'medium', or 'low'" 
      });
    }
    
    const project = await Research.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    
    // Only owner or admin can update collaborators
    const isOwner = project.createdBy && project.createdBy.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Only the project owner or admin can update collaborators." 
      });
    }
    
    // Find and update collaborator
    const collab = project.collaborators.find(c => c.userId && c.userId.toString() === userId);
    if (!collab) {
      return res.status(404).json({ 
        success: false, 
        message: "User is not a collaborator on this project." 
      });
    }
    
    collab.priority = priority;
    project.lastModifiedBy = req.user.id;
    project.lastModifiedByName = req.user.name;
    await project.save();
    
    res.json({ 
      success: true, 
      message: `Collaborator priority updated to ${priority}`,
      project 
    });
  } catch (err) { 
    res.status(400).json({ success: false, message: err.message }); 
  }
};

// Remove collaborator (only owner or admin)
exports.removeCollaborator = async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: "userId is required" 
      });
    }
    
    const project = await Research.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found." });
    
    // Only owner or admin can remove collaborators
    const isOwner = project.createdBy && project.createdBy.toString() === req.user.id;
    const isAdmin = req.user.role === "admin";
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: "Only the project owner or admin can remove collaborators." 
      });
    }
    
    // Remove collaborator
    project.collaborators = project.collaborators.filter(c => c.userId && c.userId.toString() !== userId);
    project.lastModifiedBy = req.user.id;
    project.lastModifiedByName = req.user.name;
    await project.save();
    
    res.json({ 
      success: true, 
      message: "Collaborator removed",
      project 
    });
  } catch (err) { 
    res.status(400).json({ success: false, message: err.message }); 
  }
};

exports.remove = async (req, res) => {
  try {
    await Research.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Project deleted." });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.seed = async (req, res) => {
  try {
    // Check if projects already exist
    const count = await Research.countDocuments();
    if (count > 0) {
      return res.json({ success: true, message: `Already have ${count} research projects.` });
    }

    await Research.insertMany([
      { title: "AI-Powered Crop Disease Detection Using Deep Learning", lead: "Dr. Tesfaye Worku", college: "College of Electrical Engineering & Computing", department: "Computer Science & Engineering", status: "active", startDate: "2023-02-01", endDate: "2025-01-31", fundingETB: 850000, fundingSource: "Ethiopian Science and Technology Commission", tags: ["AI", "agriculture", "deep learning"], summary: "Developing a mobile-first deep learning system to detect crop diseases from smartphone photos, targeting smallholder farmers in Oromia region.", publications: 3, teamSize: 7, centerOfExcellence: "Center of Excellence for Allied Sciences (CoE-AS)" },
      { title: "Solar-Powered Water Purification for Rural Ethiopia", lead: "Prof. Almaz Tadesse", college: "College of Mechanical, Chemical & Materials Engineering", department: "Chemical Engineering", status: "active", startDate: "2022-09-01", endDate: "2025-08-31", fundingETB: 1200000, fundingSource: "World Bank / MoSHE", tags: ["solar energy", "water purification", "rural development"], summary: "Designing low-cost solar-driven water treatment units deployable in off-grid communities, with pilot testing in Afar and SNNP regions.", publications: 5, teamSize: 9, centerOfExcellence: "Center of Excellence for Materials Science and Engineering (CoE-MSE)" },
      { title: "Seismic Risk Assessment of Adama Urban Infrastructure", lead: "Dr. Biruk Hailu", college: "College of Civil Engineering and Architecture", department: "Civil Engineering", status: "active", startDate: "2023-06-01", endDate: "2026-05-31", fundingETB: 2100000, fundingSource: "Ethiopian Disaster Risk Management Commission", tags: ["seismic", "urban planning", "infrastructure"], summary: "Comprehensive seismic vulnerability mapping of Adama city buildings using GIS, field surveys, and finite element modelling.", publications: 2, teamSize: 6, centerOfExcellence: "None" },
      { title: "Blockchain-Based Land Registry System for Ethiopia", lead: "Dr. Yonas Girma", college: "College of Electrical Engineering & Computing", department: "Computer Science & Engineering", status: "active", startDate: "2024-01-15", endDate: "2026-01-14", fundingETB: 950000, fundingSource: "Ministry of Innovation and Technology", tags: ["blockchain", "land registry", "governance"], summary: "Prototyping a tamper-proof, decentralised land ownership record system to reduce disputes and corruption in land administration.", publications: 1, teamSize: 5, centerOfExcellence: "Center of Excellence for Allied Sciences (CoE-AS)" },
      { title: "Teff Genome Sequencing and Nutritional Enhancement", lead: "Prof. Mekdes Bekele", college: "College of Applied Natural Science", department: "Biology & Biotechnology", status: "active", startDate: "2022-03-01", endDate: "2025-02-28", fundingETB: 1750000, fundingSource: "Bill & Melinda Gates Foundation", tags: ["genomics", "teff", "nutrition", "biotechnology"], summary: "Full genome sequencing of 12 teff varieties to identify genes linked to high iron and zinc content for nutritional improvement.", publications: 8, teamSize: 11, centerOfExcellence: "Center of Excellence for Allied Sciences (CoE-AS)" },
      { title: "Wind Energy Potential Mapping of Ethiopian Rift Valley", lead: "Dr. Solomon Bekele", college: "College of Electrical Engineering & Computing", department: "Electrical & Computer Engineering", status: "completed", startDate: "2021-01-01", endDate: "2023-12-31", fundingETB: 680000, fundingSource: "Ethiopian Energy Authority", tags: ["wind energy", "renewable", "GIS"], summary: "High-resolution wind resource assessment using meteorological stations, satellite data and computational fluid dynamics modelling.", publications: 6, teamSize: 8, centerOfExcellence: "Center of Excellence for Advanced Manufacturing Engineering (CoE-AME)" },
      { title: "Machine Learning for Amharic Natural Language Processing", lead: "Dr. Hana Tesfaye", college: "College of Electrical Engineering & Computing", department: "Computer Science & Engineering", status: "active", startDate: "2023-09-01", endDate: "2025-08-31", fundingETB: 720000, fundingSource: "Google Research Africa", tags: ["NLP", "Amharic", "machine learning"], summary: "Building an open-source Amharic NLP toolkit covering sentiment analysis, named entity recognition and machine translation.", publications: 4, teamSize: 6, centerOfExcellence: "Center of Excellence for Allied Sciences (CoE-AS)" },
      { title: "Geothermal Energy Exploration in Aluto-Langano", lead: "Prof. Getachew Mengistu", college: "College of Applied Natural Science", department: "Earth Sciences", status: "active", startDate: "2023-04-01", endDate: "2027-03-31", fundingETB: 3200000, fundingSource: "Icelandic International Development Agency (ICEIDA)", tags: ["geothermal", "energy", "geology"], summary: "Subsurface characterisation and resource estimation of the Aluto-Langano geothermal field using seismic, gravity and MT surveys.", publications: 3, teamSize: 14, centerOfExcellence: "Center of Excellence for Materials Science and Engineering (CoE-MSE)" },
      { title: "Smart Traffic Management System for Adama City", lead: "Dr. Robel Tadesse", college: "College of Electrical Engineering & Computing", department: "Electrical & Computer Engineering", status: "planned", startDate: "2024-07-01", endDate: "2026-06-30", fundingETB: 890000, fundingSource: "Adama City Administration", tags: ["IoT", "traffic", "smart city"], summary: "IoT sensor network and adaptive signal control algorithm to reduce congestion and vehicle emissions in Adama's central districts.", publications: 0, teamSize: 8, centerOfExcellence: "Center of Excellence for Advanced Manufacturing Engineering (CoE-AME)" },
      { title: "Traditional Medicinal Plants of Oromia: Pharmacological Study", lead: "Dr. Chaltu Wakjira", college: "College of Applied Natural Science", department: "Biology & Biotechnology", status: "active", startDate: "2022-11-01", endDate: "2025-10-31", fundingETB: 560000, fundingSource: "Ethiopian Public Health Institute", tags: ["ethnobotany", "pharmacology", "traditional medicine"], summary: "Systematic screening of 45 Oromo traditional medicinal plants for antimicrobial, anti-inflammatory and antidiabetic properties.", publications: 7, teamSize: 5, centerOfExcellence: "None" },
      { title: "Drought Prediction Model Using Satellite Remote Sensing", lead: "Dr. Fikirte Haile", college: "College of Applied Natural Science", department: "Environmental Science", status: "active", startDate: "2023-01-01", endDate: "2025-12-31", fundingETB: 980000, fundingSource: "NASA / USAID", tags: ["remote sensing", "drought", "climate"], summary: "Random forest model integrating MODIS NDVI, CHIRPS rainfall and GRACE groundwater anomaly data to predict drought onset 3 months ahead.", publications: 4, teamSize: 7, centerOfExcellence: "None" },
      { title: "Biogas Production from Coffee Processing Waste", lead: "Prof. Dawit Asfaw", college: "College of Mechanical, Chemical & Materials Engineering", department: "Chemical Engineering", status: "completed", startDate: "2020-06-01", endDate: "2023-05-31", fundingETB: 430000, fundingSource: "Ethiopian Coffee & Tea Authority", tags: ["biogas", "coffee", "waste management"], summary: "Anaerobic digestion optimisation of coffee pulp and wastewater to produce biogas for rural household energy, with field pilots in Jimma.", publications: 9, teamSize: 6, centerOfExcellence: "Center of Excellence for Materials Science and Engineering (CoE-MSE)" },
      
      // Proposals for Kanban Board (Under Review)
      { title: "High-Temperature Superconductivity in Nanostructured Fe-Based Alloys", lead: "Dr. Solomon Bekele", college: "College of Mechanical, Chemical & Materials Engineering", department: "Chemical Engineering", status: "under_review", startDate: "2026-09-01", endDate: "2028-08-31", fundingETB: 1450000, fundingSource: "ASTU Internal", tags: ["superconductivity", "nanotechnology", "alloys"], summary: "Investigating structural alloys under extreme thermal stresses to measure transition temperatures.", publications: 0, teamSize: 4, centerOfExcellence: "Center of Excellence for Materials Science and Engineering (CoE-MSE)" },
      { title: "Automated Micro-Grid Energy Balancing System for Off-Grid Campus", lead: "Dr. Robel Tadesse", college: "College of Electrical Engineering & Computing", department: "Electrical & Computer Engineering", status: "under_review", startDate: "2026-10-15", endDate: "2028-10-14", fundingETB: 1850000, fundingSource: "Ministry of Innovation and Technology", tags: ["microgrid", "solar", "energy efficiency"], summary: "Designing control algorithms for solar hybrid microgrids on campus.", publications: 0, teamSize: 5, centerOfExcellence: "Center of Excellence for Advanced Manufacturing Engineering (CoE-AME)" },
      { title: "Amharic Speech-to-Text Recognition System using Transformers", lead: "Dr. Hana Tesfaye", college: "College of Electrical Engineering & Computing", department: "Computer Science & Engineering", status: "under_review", startDate: "2026-11-01", endDate: "2027-10-31", fundingETB: 920000, fundingSource: "Google Research Africa", tags: ["NLP", "speech recognition", "transformers"], summary: "Developing open source automatic speech recognition tools for low-resource Amharic dialects.", publications: 0, teamSize: 3, centerOfExcellence: "Center of Excellence for Allied Sciences (CoE-AS)" }
    ]);
    const total = await Research.countDocuments();
    res.json({ success: true, message: `Seeded ${total} research projects and proposal mockups.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
