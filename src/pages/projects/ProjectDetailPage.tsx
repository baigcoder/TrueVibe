/**
 * ProjectDetailPage - Public project detail view
 * Features:
 * - Hero section with thumbnail
 * - Screenshots gallery with lightbox
 * - Video section with player
 * - Tech stack badges
 * - External links
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from '@tanstack/react-router';
import { projectsApi } from '@/api/client';
import {
    ArrowLeft,
    ExternalLink,
    Github,
    Globe,
    Play,
    X,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Tag,
    Loader2,
    AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import styles from './ProjectDetailPage.module.css';

interface ProjectMedia {
    url: string;
    publicId?: string;
    width?: number;
    height?: number;
    thumbnailUrl?: string;
    duration?: number;
}

interface ProjectLink {
    label: string;
    url: string;
    icon?: string;
}

interface Project {
    _id: string;
    title: string;
    slug: string;
    description: string;
    shortDescription?: string;
    thumbnail: ProjectMedia;
    screenshots: ProjectMedia[];
    videos: ProjectMedia[];
    links: ProjectLink[];
    techStack: string[];
    tags: string[];
    category?: string;
    status: string;
    featured: boolean;
    createdAt: string;
}

const ProjectDetailPage: React.FC = () => {
    const { id } = useParams({ strict: false }) as { id: string };
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxType, setLightboxType] = useState<'screenshot' | 'video'>('screenshot');

    // Fetch project
    const { data: projectData, isLoading, error } = useQuery({
        queryKey: ['project', id],
        queryFn: async () => {
            const response = await projectsApi.getById(id);
            return response as { data: Project };
        },
        enabled: !!id,
    });

    const project = projectData?.data;

    // Open lightbox
    const openLightbox = (index: number, type: 'screenshot' | 'video') => {
        setLightboxIndex(index);
        setLightboxType(type);
        setLightboxOpen(true);
    };

    // Navigate lightbox
    const navigateLightbox = (direction: 'prev' | 'next') => {
        const items = lightboxType === 'screenshot' ? project?.screenshots : project?.videos;
        if (!items) return;

        if (direction === 'prev') {
            setLightboxIndex((prev) => (prev > 0 ? prev - 1 : items.length - 1));
        } else {
            setLightboxIndex((prev) => (prev < items.length - 1 ? prev + 1 : 0));
        }
    };

    // Get link icon
    const getLinkIcon = (icon?: string) => {
        switch (icon) {
            case 'github':
                return <Github size={18} />;
            case 'demo':
            case 'website':
                return <Globe size={18} />;
            default:
                return <ExternalLink size={18} />;
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 className={styles.spinner} />
                <span>Loading project...</span>
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className={styles.errorContainer}>
                <AlertCircle size={48} />
                <h2>Project Not Found</h2>
                <p>The project you're looking for doesn't exist or has been removed.</p>
                <Link to="/app/feed">
                    <Button>
                        <ArrowLeft size={18} />
                        Back to Feed
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <Link to="/app/feed" className={styles.backLink}>
                    <ArrowLeft size={20} />
                    Back
                </Link>
            </header>

            {/* Hero Section */}
            <section className={styles.hero}>
                <div className={styles.heroImage}>
                    <img src={project.thumbnail?.url} alt={project.title} />
                    <div className={styles.heroOverlay} />
                </div>
                <div className={styles.heroContent}>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={styles.title}
                    >
                        {project.title}
                    </motion.h1>
                    {project.shortDescription && (
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className={styles.subtitle}
                        >
                            {project.shortDescription}
                        </motion.p>
                    )}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={styles.heroMeta}
                    >
                        {project.category && (
                            <span className={styles.category}>{project.category}</span>
                        )}
                        <span className={styles.date}>
                            <Calendar size={14} />
                            {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                        </span>
                    </motion.div>
                </div>
            </section>

            {/* Main Content */}
            <main className={styles.main}>
                {/* Description */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>About This Project</h2>
                    <div className={styles.description}>
                        {project.description.split('\n').map((paragraph, idx) => (
                            <p key={idx}>{paragraph}</p>
                        ))}
                    </div>
                </section>

                {/* Tech Stack */}
                {project.techStack && project.techStack.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <Tag size={18} />
                            Tech Stack
                        </h2>
                        <div className={styles.techStack}>
                            {project.techStack.map((tech, idx) => (
                                <motion.span
                                    key={idx}
                                    className={styles.techBadge}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                >
                                    {tech}
                                </motion.span>
                            ))}
                        </div>
                    </section>
                )}

                {/* Screenshots Gallery */}
                {project.screenshots && project.screenshots.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Screenshots</h2>
                        <div className={styles.screenshotGrid}>
                            {project.screenshots.map((screenshot, idx) => (
                                <motion.div
                                    key={idx}
                                    className={styles.screenshotItem}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={() => openLightbox(idx, 'screenshot')}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <img src={screenshot.url} alt={`Screenshot ${idx + 1}`} />
                                    <div className={styles.screenshotOverlay}>
                                        <span>View Full Size</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Videos */}
                {project.videos && project.videos.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Videos</h2>
                        <div className={styles.videoGrid}>
                            {project.videos.map((video, idx) => (
                                <motion.div
                                    key={idx}
                                    className={styles.videoItem}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={() => openLightbox(idx, 'video')}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <div className={styles.videoThumbnail}>
                                        {video.thumbnailUrl ? (
                                            <img src={video.thumbnailUrl} alt={`Video ${idx + 1}`} />
                                        ) : (
                                            <video src={video.url} />
                                        )}
                                        <div className={styles.playButton}>
                                            <Play size={32} />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Links */}
                {project.links && project.links.length > 0 && (
                    <section className={styles.section}>
                        <h2 className={styles.sectionTitle}>Links</h2>
                        <div className={styles.links}>
                            {project.links.map((link, idx) => (
                                <motion.a
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.linkButton}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    {getLinkIcon(link.icon)}
                                    {link.label}
                                    <ExternalLink size={14} className={styles.linkExternal} />
                                </motion.a>
                            ))}
                        </div>
                    </section>
                )}

                {/* Tags */}
                {project.tags && project.tags.length > 0 && (
                    <section className={styles.section}>
                        <div className={styles.tags}>
                            {project.tags.map((tag, idx) => (
                                <span key={idx} className={styles.tag}>
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxOpen && (
                    <motion.div
                        className={styles.lightbox}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxOpen(false)}
                    >
                        <button
                            className={styles.lightboxClose}
                            onClick={() => setLightboxOpen(false)}
                        >
                            <X size={24} />
                        </button>

                        <button
                            className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                navigateLightbox('prev');
                            }}
                        >
                            <ChevronLeft size={32} />
                        </button>

                        <div
                            className={styles.lightboxContent}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {lightboxType === 'screenshot' ? (
                                <motion.img
                                    key={lightboxIndex}
                                    src={project.screenshots[lightboxIndex]?.url}
                                    alt={`Screenshot ${lightboxIndex + 1}`}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                />
                            ) : (
                                <motion.video
                                    key={lightboxIndex}
                                    src={project.videos[lightboxIndex]?.url}
                                    controls
                                    autoPlay
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                />
                            )}
                        </div>

                        <button
                            className={`${styles.lightboxNav} ${styles.lightboxNext}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                navigateLightbox('next');
                            }}
                        >
                            <ChevronRight size={32} />
                        </button>

                        <div className={styles.lightboxCounter}>
                            {lightboxIndex + 1} /{' '}
                            {lightboxType === 'screenshot'
                                ? project.screenshots?.length
                                : project.videos?.length}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProjectDetailPage;
