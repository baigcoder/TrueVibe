/**
 * AdminProjectsPage - Admin panel for managing projects
 * Features:
 * - Project list with status badges
 * - Create/Edit project form
 * - Image/Video uploads with local preview
 * - Cloudinary integration
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/client';
import {
    Plus,
    Edit,
    Trash2,
    Eye,
    ArrowLeft,
    Save,
    Loader2,
    FolderOpen,
    ExternalLink,
    Github,
    Globe,
    Tag,
    Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import MediaUploader, { MediaFile } from '@/components/admin/MediaUploader';
import styles from './AdminProjectsPage.module.css';

interface Project {
    _id: string;
    title: string;
    slug: string;
    description: string;
    shortDescription?: string;
    thumbnail: { url: string; publicId?: string };
    screenshots: Array<{ url: string; publicId?: string }>;
    videos: Array<{ url: string; publicId?: string; thumbnailUrl?: string }>;
    links: Array<{ label: string; url: string; icon?: string }>;
    techStack: string[];
    tags: string[];
    category?: string;
    status: 'draft' | 'published' | 'archived';
    featured: boolean;
    createdAt: string;
}

interface ProjectFormData {
    title: string;
    description: string;
    shortDescription: string;
    thumbnail: MediaFile[];
    screenshots: MediaFile[];
    videos: MediaFile[];
    links: Array<{ label: string; url: string; icon: string }>;
    techStack: string;
    tags: string;
    category: string;
    status: 'draft' | 'published' | 'archived';
    featured: boolean;
}

const AdminProjectsPage: React.FC = () => {
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const queryClient = useQueryClient();

    // Fetch projects
    const { data: projectsData, isLoading } = useQuery({
        queryKey: ['admin-projects'],
        queryFn: async () => {
            const response = await projectsApi.getAll();
            return response as { data: Project[] };
        },
    });

    const projects = projectsData?.data || [];

    // Create project
    const createMutation = useMutation({
        mutationFn: async (data: Record<string, unknown>) => {
            return projectsApi.create(data as Parameters<typeof projectsApi.create>[0]);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
            toast.success('Project created successfully!');
            setView('list');
            setEditingProject(null);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to create project');
        },
    });

    // Update project
    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
            return projectsApi.update(id, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
            toast.success('Project updated successfully!');
            setView('list');
            setEditingProject(null);
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update project');
        },
    });

    // Delete project
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return projectsApi.delete(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
            toast.success('Project deleted successfully!');
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to delete project');
        },
    });

    const handleEdit = (project: Project) => {
        setEditingProject(project);
        setView('form');
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this project?')) {
            deleteMutation.mutate(id);
        }
    };

    const handleNew = () => {
        setEditingProject(null);
        setView('form');
    };

    const handleBack = () => {
        setView('list');
        setEditingProject(null);
    };

    return (
        <div className={styles.container}>
            <AnimatePresence mode="wait">
                {view === 'list' ? (
                    <ProjectList
                        key="list"
                        projects={projects}
                        isLoading={isLoading}
                        onNew={handleNew}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                ) : (
                    <ProjectForm
                        key="form"
                        project={editingProject}
                        onBack={handleBack}
                        onSubmit={(data) => {
                            if (editingProject) {
                                updateMutation.mutate({ id: editingProject._id, data });
                            } else {
                                createMutation.mutate(data);
                            }
                        }}
                        isSubmitting={createMutation.isPending || updateMutation.isPending}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

// Project List Component
const ProjectList: React.FC<{
    projects: Project[];
    isLoading: boolean;
    onNew: () => void;
    onEdit: (project: Project) => void;
    onDelete: (id: string) => void;
}> = ({ projects, isLoading, onNew, onEdit, onDelete }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published':
                return styles.statusPublished;
            case 'draft':
                return styles.statusDraft;
            case 'archived':
                return styles.statusArchived;
            default:
                return '';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={styles.listContainer}
        >
            <div className={styles.header}>
                <div className={styles.headerInfo}>
                    <FolderOpen className={styles.headerIcon} />
                    <h1 className={styles.title}>Projects</h1>
                </div>
                <Button onClick={onNew} className={styles.addButton}>
                    <Plus size={18} />
                    New Project
                </Button>
            </div>

            {isLoading ? (
                <div className={styles.loadingContainer}>
                    <Loader2 className={styles.spinner} />
                    <span>Loading projects...</span>
                </div>
            ) : projects.length === 0 ? (
                <div className={styles.emptyState}>
                    <FolderOpen size={48} className={styles.emptyIcon} />
                    <p>No projects yet</p>
                    <Button onClick={onNew} variant="outline">
                        Create your first project
                    </Button>
                </div>
            ) : (
                <div className={styles.projectGrid}>
                    {projects.map((project) => (
                        <motion.div
                            key={project._id}
                            className={styles.projectCard}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className={styles.cardImage}>
                                <img
                                    src={project.thumbnail?.url || '/placeholder.png'}
                                    alt={project.title}
                                />
                                {project.featured && (
                                    <div className={styles.featuredBadge}>
                                        <Star size={12} />
                                        Featured
                                    </div>
                                )}
                            </div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{project.title}</h3>
                                <p className={styles.cardDescription}>
                                    {project.shortDescription || project.description.slice(0, 100)}...
                                </p>
                                <div className={styles.cardMeta}>
                                    <span className={`${styles.status} ${getStatusColor(project.status)}`}>
                                        {project.status}
                                    </span>
                                    <span className={styles.mediaCount}>
                                        {project.screenshots?.length || 0} screenshots
                                    </span>
                                </div>
                            </div>
                            <div className={styles.cardActions}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(`/app/projects/${project.slug}`, '_blank')}
                                >
                                    <Eye size={16} />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => onEdit(project)}>
                                    <Edit size={16} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDelete(project._id)}
                                    className={styles.deleteButton}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

// Project Form Component
const ProjectForm: React.FC<{
    project: Project | null;
    onBack: () => void;
    onSubmit: (data: Record<string, unknown>) => void;
    isSubmitting: boolean;
}> = ({ project, onBack, onSubmit, isSubmitting }) => {
    const [formData, setFormData] = useState<ProjectFormData>({
        title: '',
        description: '',
        shortDescription: '',
        thumbnail: [],
        screenshots: [],
        videos: [],
        links: [{ label: '', url: '', icon: '' }],
        techStack: '',
        tags: '',
        category: '',
        status: 'draft',
        featured: false,
    });

    // Populate form when editing
    useEffect(() => {
        if (project) {
            setFormData({
                title: project.title,
                description: project.description,
                shortDescription: project.shortDescription || '',
                thumbnail: project.thumbnail
                    ? [{
                        id: 'existing-thumb',
                        url: project.thumbnail.url,
                        publicId: project.thumbnail.publicId,
                        status: 'done',
                    }]
                    : [],
                screenshots: project.screenshots?.map((s, i) => ({
                    id: `existing-ss-${i}`,
                    url: s.url,
                    publicId: s.publicId,
                    status: 'done' as const,
                })) || [],
                videos: project.videos?.map((v, i) => ({
                    id: `existing-vid-${i}`,
                    url: v.url,
                    publicId: v.publicId,
                    thumbnailUrl: v.thumbnailUrl,
                    status: 'done' as const,
                })) || [],
                links: project.links?.length > 0
                    ? project.links.map(l => ({ ...l, icon: l.icon || '' }))
                    : [{ label: '', url: '', icon: '' }],
                techStack: project.techStack?.join(', ') || '',
                tags: project.tags?.join(', ') || '',
                category: project.category || '',
                status: project.status,
                featured: project.featured,
            });
        }
    }, [project]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required fields
        if (!formData.title.trim()) {
            toast.error('Title is required');
            return;
        }
        if (!formData.description.trim()) {
            toast.error('Description is required');
            return;
        }
        if (formData.thumbnail.length === 0 || !formData.thumbnail[0]?.url) {
            toast.error('Thumbnail is required');
            return;
        }

        // Check all uploads are complete
        const allUploaded = [
            ...formData.thumbnail,
            ...formData.screenshots,
            ...formData.videos,
        ].every(f => f.status === 'done');

        if (!allUploaded) {
            toast.error('Please wait for all uploads to complete');
            return;
        }

        // Transform form data to API format
        const submitData = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            shortDescription: formData.shortDescription.trim(),
            thumbnail: {
                url: formData.thumbnail[0].url,
                publicId: formData.thumbnail[0].publicId,
                width: formData.thumbnail[0].width,
                height: formData.thumbnail[0].height,
            },
            screenshots: formData.screenshots.map(s => ({
                url: s.url,
                publicId: s.publicId,
                width: s.width,
                height: s.height,
            })),
            videos: formData.videos.map(v => ({
                url: v.url,
                publicId: v.publicId,
                thumbnailUrl: v.thumbnailUrl,
                duration: v.duration,
            })),
            links: formData.links.filter(l => l.label && l.url),
            techStack: formData.techStack.split(',').map(t => t.trim()).filter(Boolean),
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            category: formData.category.trim(),
            status: formData.status,
            featured: formData.featured,
        };

        onSubmit(submitData);
    };

    const addLink = () => {
        setFormData(prev => ({
            ...prev,
            links: [...prev.links, { label: '', url: '', icon: '' }],
        }));
    };

    const removeLink = (index: number) => {
        setFormData(prev => ({
            ...prev,
            links: prev.links.filter((_, i) => i !== index),
        }));
    };

    const updateLink = (index: number, field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            links: prev.links.map((link, i) =>
                i === index ? { ...link, [field]: value } : link
            ),
        }));
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={styles.formContainer}
        >
            <div className={styles.formHeader}>
                <Button variant="ghost" onClick={onBack} className={styles.backButton}>
                    <ArrowLeft size={18} />
                    Back to Projects
                </Button>
                <h1 className={styles.formTitle}>
                    {project ? 'Edit Project' : 'Create New Project'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                {/* Basic Info */}
                <section className={styles.formSection}>
                    <h2 className={styles.sectionTitle}>Basic Information</h2>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                            className={styles.input}
                            placeholder="Enter project title"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Short Description</label>
                        <input
                            type="text"
                            value={formData.shortDescription}
                            onChange={(e) => setFormData(prev => ({ ...prev, shortDescription: e.target.value }))}
                            className={styles.input}
                            placeholder="Brief one-liner about the project"
                            maxLength={500}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Full Description *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className={styles.textarea}
                            placeholder="Detailed project description..."
                            rows={6}
                        />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Category</label>
                            <input
                                type="text"
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                className={styles.input}
                                placeholder="e.g., Web App, Mobile, AI"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    status: e.target.value as 'draft' | 'published' | 'archived'
                                }))}
                                className={styles.select}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="archived">Archived</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.checkbox}>
                            <input
                                type="checkbox"
                                checked={formData.featured}
                                onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                            />
                            <Star size={16} />
                            Featured Project
                        </label>
                    </div>
                </section>

                {/* Media Uploads */}
                <section className={styles.formSection}>
                    <h2 className={styles.sectionTitle}>Media</h2>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Thumbnail Image *</label>
                        <MediaUploader
                            type="image"
                            multiple={false}
                            value={formData.thumbnail}
                            onChange={(files) => setFormData(prev => ({ ...prev, thumbnail: files }))}
                            folder="truevibe/projects/thumbnails"
                            placeholder="Upload project thumbnail"
                            aspectRatio="16:9"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Screenshots</label>
                        <MediaUploader
                            type="image"
                            multiple
                            maxFiles={10}
                            value={formData.screenshots}
                            onChange={(files) => setFormData(prev => ({ ...prev, screenshots: files }))}
                            folder="truevibe/projects/screenshots"
                            placeholder="Upload project screenshots"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Videos</label>
                        <MediaUploader
                            type="video"
                            multiple
                            maxFiles={5}
                            value={formData.videos}
                            onChange={(files) => setFormData(prev => ({ ...prev, videos: files }))}
                            folder="truevibe/projects/videos"
                            placeholder="Upload demo videos"
                        />
                    </div>
                </section>

                {/* Tech Stack & Tags */}
                <section className={styles.formSection}>
                    <h2 className={styles.sectionTitle}>Tech Stack & Tags</h2>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            <Tag size={16} />
                            Tech Stack
                        </label>
                        <input
                            type="text"
                            value={formData.techStack}
                            onChange={(e) => setFormData(prev => ({ ...prev, techStack: e.target.value }))}
                            className={styles.input}
                            placeholder="React, Node.js, MongoDB (comma separated)"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Tags</label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                            className={styles.input}
                            placeholder="fullstack, ai, social (comma separated)"
                        />
                    </div>
                </section>

                {/* Links */}
                <section className={styles.formSection}>
                    <h2 className={styles.sectionTitle}>Project Links</h2>

                    {formData.links.map((link, index) => (
                        <div key={index} className={styles.linkRow}>
                            <select
                                value={link.icon}
                                onChange={(e) => updateLink(index, 'icon', e.target.value)}
                                className={styles.select}
                                style={{ width: '120px' }}
                            >
                                <option value="">Type</option>
                                <option value="github">GitHub</option>
                                <option value="demo">Demo</option>
                                <option value="website">Website</option>
                                <option value="other">Other</option>
                            </select>
                            <input
                                type="text"
                                value={link.label}
                                onChange={(e) => updateLink(index, 'label', e.target.value)}
                                className={styles.input}
                                placeholder="Label"
                                style={{ flex: 1 }}
                            />
                            <input
                                type="url"
                                value={link.url}
                                onChange={(e) => updateLink(index, 'url', e.target.value)}
                                className={styles.input}
                                placeholder="https://..."
                                style={{ flex: 2 }}
                            />
                            {formData.links.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeLink(index)}
                                    className={styles.deleteButton}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            )}
                        </div>
                    ))}

                    <Button type="button" variant="outline" onClick={addLink} className={styles.addLinkButton}>
                        <Plus size={16} />
                        Add Link
                    </Button>
                </section>

                {/* Submit */}
                <div className={styles.formActions}>
                    <Button type="button" variant="outline" onClick={onBack}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className={styles.spinner} size={18} />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                {project ? 'Update Project' : 'Create Project'}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </motion.div>
    );
};

export default AdminProjectsPage;
