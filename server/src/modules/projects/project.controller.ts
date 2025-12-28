import { Request, Response } from 'express';
import { Project, IProject, ProjectStatus } from './Project.model.js';

// Create a new project
export const createProject = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: { message: 'Unauthorized' } });
        }

        const {
            title,
            description,
            shortDescription,
            thumbnail,
            screenshots,
            videos,
            links,
            techStack,
            tags,
            category,
            status,
            featured,
            order,
        } = req.body;

        if (!title || !description || !thumbnail) {
            return res.status(400).json({
                error: { message: 'Title, description, and thumbnail are required' }
            });
        }

        // Generate slug from title
        const baseSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const slug = `${baseSlug}-${Date.now()}`;

        const project = new Project({
            title,
            slug,
            description,
            shortDescription,
            thumbnail,
            screenshots: screenshots || [],
            videos: videos || [],
            links: links || [],
            techStack: techStack || [],
            tags: tags || [],
            category,
            status: status || 'draft',
            featured: featured || false,
            order: order || 0,
            createdBy: userId,
        });

        await project.save();

        res.status(201).json({ data: project });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: { message: 'Failed to create project' } });
    }
};

// Get all projects (with filtering)
export const getProjects = async (req: Request, res: Response) => {
    try {
        const { status, featured, category, limit = '20', page = '1' } = req.query;
        const isAdmin = req.user?.role === 'admin';

        const query: Record<string, unknown> = { isDeleted: false };

        // Non-admins can only see published projects
        if (!isAdmin) {
            query.status = 'published';
        } else if (status) {
            query.status = status;
        }

        if (featured === 'true') {
            query.featured = true;
        }

        if (category) {
            query.category = category;
        }

        const pageNum = parseInt(page as string, 10) || 1;
        const limitNum = parseInt(limit as string, 10) || 20;
        const skip = (pageNum - 1) * limitNum;

        const [projects, total] = await Promise.all([
            Project.find(query)
                .sort({ order: 1, createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Project.countDocuments(query),
        ]);

        res.json({
            data: projects,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        });
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: { message: 'Failed to fetch projects' } });
    }
};

// Get single project by ID or slug
export const getProjectById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const isAdmin = req.user?.role === 'admin';

        const query: Record<string, unknown> = {
            isDeleted: false,
            $or: [
                { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
                { slug: id },
            ],
        };

        // Non-admins can only see published projects
        if (!isAdmin) {
            query.status = 'published';
        }

        const project = await Project.findOne(query).lean();

        if (!project) {
            return res.status(404).json({ error: { message: 'Project not found' } });
        }

        res.json({ data: project });
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: { message: 'Failed to fetch project' } });
    }
};

// Update project
export const updateProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: { message: 'Unauthorized' } });
        }

        const project = await Project.findById(id);

        if (!project || project.isDeleted) {
            return res.status(404).json({ error: { message: 'Project not found' } });
        }

        // Allow update of all editable fields
        const allowedUpdates = [
            'title',
            'description',
            'shortDescription',
            'thumbnail',
            'screenshots',
            'videos',
            'links',
            'techStack',
            'tags',
            'category',
            'status',
            'featured',
            'order',
        ];

        allowedUpdates.forEach((field) => {
            if (req.body[field] !== undefined) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (project as any)[field] = req.body[field];
            }
        });

        // Regenerate slug if title changes
        if (req.body.title && req.body.title !== project.title) {
            const baseSlug = req.body.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            project.slug = `${baseSlug}-${Date.now()}`;
        }

        await project.save();

        res.json({ data: project });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ error: { message: 'Failed to update project' } });
    }
};

// Delete project (soft delete)
export const deleteProject = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const project = await Project.findById(id);

        if (!project || project.isDeleted) {
            return res.status(404).json({ error: { message: 'Project not found' } });
        }

        project.isDeleted = true;
        await project.save();

        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: { message: 'Failed to delete project' } });
    }
};

// Reorder projects
export const reorderProjects = async (req: Request, res: Response) => {
    try {
        const { projectIds } = req.body;

        if (!Array.isArray(projectIds)) {
            return res.status(400).json({ error: { message: 'projectIds must be an array' } });
        }

        // Update order for each project
        const updatePromises = projectIds.map((id: string, index: number) =>
            Project.findByIdAndUpdate(id, { order: index })
        );

        await Promise.all(updatePromises);

        res.json({ message: 'Projects reordered successfully' });
    } catch (error) {
        console.error('Error reordering projects:', error);
        res.status(500).json({ error: { message: 'Failed to reorder projects' } });
    }
};
