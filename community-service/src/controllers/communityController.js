const Community = require("../models/Community");

exports.getAll = async (req, res) => {
  try {
    const { status, college, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status)  query.status = status;
    if (college) query.college = new RegExp(college, "i");
    if (search)  query.$or = [{ title: new RegExp(search, "i") }, { lead: new RegExp(search, "i") }, { location: new RegExp(search, "i") }];
    const projects = await Community.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)).maxTimeMS(5000);
    const total = projects.length;
    res.json({ success: true, total, projects });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getOne = async (req, res) => {
  try {
    const project = await Community.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Not found." });
    res.json({ success: true, project });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.create = async (req, res) => {
  try {
    const project = await Community.create({
      ...req.body,
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
    const project = await Community.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: "Not found." });
    
    // Ownership check: Only admin or project owner can edit
    const isOwner = project.createdBy && project.createdBy.toString() === req.user.id;
    const isCollaborator = project.collaborators && project.collaborators.some(c => c.toString() === req.user.id);
    const isAdmin = req.user.role === "admin";
    
    if (!isAdmin && !isOwner && !isCollaborator) {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Only the project owner, collaborators, or admins can edit this project.",
        owner: project.createdByName || "Unknown"
      });
    }
    
    // Update project and track who modified it
    const updatedProject = await Community.findByIdAndUpdate(
      req.params.id, 
      {
        ...req.body,
        lastModifiedBy: req.user.id,
        lastModifiedByName: req.user.name,
      }, 
      { new: true, runValidators: true }
    );
    
    res.json({ success: true, project: updatedProject });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
};

exports.remove = async (req, res) => {
  try {
    await Community.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Project deleted." });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.seed = async (req, res) => {
  try {
    const count = await Community.countDocuments();
    if (count > 0) return res.json({ success: true, message: `Already have ${count} community projects.` });

    await Community.insertMany([
      { title: "Free Coding Bootcamp for Adama Youth", lead: "Dr. Robel Tadesse", college: "College of Engineering", status: "active", startDate: "2024-01-15", endDate: "2024-12-31", budgetETB: 180000, location: "Adama City", beneficiaries: 320, volunteers: 45, tags: ["coding", "youth", "education", "outreach"], summary: "12-week intensive programming bootcamp for unemployed youth aged 18-30 in Adama, covering Python, web development and mobile apps.", impact: "320 youth trained, 85 placed in tech jobs" },
      { title: "Clean Water Access for Wolenchiti Kebele", lead: "Prof. Almaz Tadesse", college: "College of Engineering", status: "active", startDate: "2023-06-01", endDate: "2025-05-31", budgetETB: 450000, location: "Wolenchiti, East Shewa", beneficiaries: 2400, volunteers: 30, tags: ["water", "sanitation", "rural", "health"], summary: "Installation of solar-powered water pumping system and distribution network serving 2,400 residents of Wolenchiti kebele.", impact: "2,400 people gained access to clean water" },
      { title: "Women Entrepreneurship & Financial Literacy Programme", lead: "Dr. Selamawit Girma", college: "College of Business and Economics", status: "active", startDate: "2023-09-01", endDate: "2025-08-31", budgetETB: 220000, location: "Adama & Modjo", beneficiaries: 580, volunteers: 22, tags: ["women", "entrepreneurship", "financial literacy", "empowerment"], summary: "Business skills training, micro-loan facilitation and mentorship for women-owned small enterprises in Adama and Modjo towns.", impact: "580 women trained, 210 businesses launched" },
      { title: "ASTU Blood Donation Campaign", lead: "Dr. Chaltu Wakjira", college: "College of Medical and Health Sciences", status: "active", startDate: "2024-02-01", endDate: "2024-12-31", budgetETB: 45000, location: "Adama, Multiple Sites", beneficiaries: 9000, volunteers: 120, tags: ["health", "blood donation", "campus", "community"], summary: "Bi-monthly blood donation drives across ASTU campus and partner high schools, supplying Adama General Hospital and nearby health centres.", impact: "1,800 units donated, supplying 3 hospitals" },
      { title: "Tree Planting & Green Adama Initiative", lead: "Dr. Fikirte Haile", college: "College of Natural and Computational Sciences", status: "active", startDate: "2023-07-15", endDate: "2026-07-14", budgetETB: 130000, location: "Adama City Green Belt", beneficiaries: 50000, volunteers: 850, tags: ["environment", "tree planting", "climate", "urban greening"], summary: "Mass tree planting campaign targeting 100,000 indigenous tree seedlings along Adama city roads, schools and degraded hillsides.", impact: "62,000 trees planted across 14 sites" },
      { title: "Digital Literacy for Secondary School Teachers", lead: "Dr. Hana Tesfaye", college: "College of Engineering", status: "completed", startDate: "2023-01-01", endDate: "2023-12-31", budgetETB: 95000, location: "East Shewa Zone", beneficiaries: 480, volunteers: 35, tags: ["digital literacy", "teachers", "education", "ICT"], summary: "Intensive 3-week ICT training for 480 secondary school teachers covering office software, internet research and basic data management.", impact: "480 teachers certified, 24 schools equipped" },
      { title: "Mental Health Awareness on ASTU Campus", lead: "Dr. Mekdes Bekele", college: "College of Medical and Health Sciences", status: "active", startDate: "2024-03-01", endDate: "2024-12-31", budgetETB: 38000, location: "ASTU Campus", beneficiaries: 6500, volunteers: 60, tags: ["mental health", "students", "wellbeing", "campus"], summary: "Peer counselling network, monthly awareness seminars and anonymous helpline supporting student mental health across all departments.", impact: "6,500 students reached, 340 counselling sessions" },
      { title: "Micro-Enterprise Support for Adama Street Vendors", lead: "Prof. Tesfaye Demissie", college: "College of Business and Economics", status: "active", startDate: "2023-10-01", endDate: "2025-09-30", budgetETB: 175000, location: "Adama City Markets", beneficiaries: 760, volunteers: 28, tags: ["micro-enterprise", "poverty reduction", "market", "livelihoods"], summary: "Business registration support, bookkeeping training and group savings scheme for informal street vendors in Adama city centre.", impact: "760 vendors formalised, average income up 34%" },
    ]);
    const total = await Community.countDocuments();
    res.json({ success: true, message: `Seeded ${total} community projects.` });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
