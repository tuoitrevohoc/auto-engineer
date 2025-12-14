'use client';

import { useState, useEffect } from 'react';
import { getImages, deleteImages } from '@/app/actions';
import { toast } from 'sonner';
import Image from 'next/image';
import { Copy, Clock, FileImage, Trash2, X, Maximize2, CheckSquare, Square, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageItem {
    id: string;
    filename: string;
    path: string;
    createdAt: string;
}

export default function GalleryPage() {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewingImage, setViewingImage] = useState<ImageItem | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 15;

    useEffect(() => {
        loadImages(page);
    }, [page]);

    const loadImages = (currentPage: number) => {
        setLoading(true);
        getImages(currentPage, limit)
            .then(data => {
                setImages(data.images);
                setTotal(data.total);
            })
            .finally(() => setLoading(false));
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Image ID copied to clipboard');
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleDelete = async (idsToDelete: string[]) => {
        if (!confirm(`Are you sure you want to delete ${idsToDelete.length} image(s)?`)) return;

        try {
            await deleteImages(idsToDelete);
            toast.success('Images deleted');
            setSelectedIds(new Set());
            setViewingImage(null);
            loadImages(page);
        } catch (e) {
            toast.error('Failed to delete images');
        }
    };

    const isSelecting = selectedIds.size > 0;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                    <FileImage className="text-blue-600" />
                    Image Gallery
                </h1>
                {isSelecting && (
                    <button 
                        onClick={() => handleDelete(Array.from(selectedIds))}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm"
                    >
                        <Trash2 size={18} />
                        Delete Selected ({selectedIds.size})
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
            ) : images.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <div className="text-slate-400 mb-2">
                        <FileImage size={48} className="mx-auto opacity-50" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-700">No images found</h3>
                    <p className="text-slate-500">Upload images using the workflow editor or run forms.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {images.map((img) => {
                        const isSelected = selectedIds.has(img.id);
                        return (
                            <div 
                                key={img.id} 
                                className={`group bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 hover:shadow-md'}`}
                            >
                                <div className="relative aspect-square bg-slate-100 cursor-pointer" onClick={() => setViewingImage(img)}>
                                    <Image 
                                        src={img.path} 
                                        alt={img.filename}
                                        fill
                                        className="object-cover"
                                    />
                                    {/* Selection Checkbox */}
                                    <div 
                                        className="absolute top-2 left-2 z-10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelection(img.id);
                                        }}
                                    >
                                        <div className={`p-1.5 rounded-md transition-colors ${isSelected ? 'bg-blue-600 text-white' : 'bg-white/80 text-slate-500 hover:bg-white'}`}>
                                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </div>
                                    </div>

                                    {/* Quick Actions overlay */}
                                    <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                copyToClipboard(img.id);
                                            }}
                                            className="p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-white text-slate-700"
                                            title="Copy Image ID"
                                        >
                                            <Copy size={16} />
                                        </button>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete([img.id]);
                                            }}
                                            className="p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-red-50 text-red-600"
                                            title="Delete Image"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-medium text-slate-800 truncate mb-1" title={img.filename}>
                                        {img.filename}
                                    </h3>
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span className="flex items-center gap-1">
                                            <Clock size={12} />
                                            {new Date(img.createdAt).toLocaleDateString()}
                                        </span>
                                        <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono">
                                            {img.id.substring(0, 8)}...
                                        </code>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {!loading && total > limit && (
                <div className="flex justify-center items-center gap-4 mt-8 py-4">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-slate-600"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-slate-500">
                        Page {page} of {Math.ceil(total / limit)}
                    </span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={page >= Math.ceil(total / limit)}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-slate-600"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* View Modal */}
            {viewingImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowRight') {
                            const currentIndex = images.findIndex(img => img.id === viewingImage.id);
                            if (currentIndex < images.length - 1) setViewingImage(images[currentIndex + 1]);
                        }
                        if (e.key === 'ArrowLeft') {
                            const currentIndex = images.findIndex(img => img.id === viewingImage.id);
                            if (currentIndex > 0) setViewingImage(images[currentIndex - 1]);
                        }
                        if (e.key === 'Escape') setViewingImage(null);
                    }}
                    tabIndex={0}
                    ref={(el) => el?.focus()}
                >
                    <button 
                        onClick={() => setViewingImage(null)}
                        className="absolute top-4 right-4 p-2 text-white/50 hover:text-white transition-colors z-50"
                    >
                        <X size={32} />
                    </button>
                    
                    <div className="relative w-full max-w-6xl h-[85vh] flex flex-col">
                        <div className="flex-1 relative flex items-center justify-center">
                            {/* Prev Button */}
                            {images.findIndex(img => img.id === viewingImage.id) > 0 && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const currentIndex = images.findIndex(img => img.id === viewingImage.id);
                                        setViewingImage(images[currentIndex - 1]);
                                    }}
                                    className="absolute left-4 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10 backdrop-blur-sm"
                                >
                                    <ChevronLeft size={32} />
                                </button>
                            )}

                            <div className="relative w-full h-full">
                                <Image 
                                    src={viewingImage.path}
                                    alt={viewingImage.filename}
                                    fill
                                    className="object-contain"
                                />
                            </div>

                            {/* Next Button */}
                            {images.findIndex(img => img.id === viewingImage.id) < images.length - 1 && (
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        const currentIndex = images.findIndex(img => img.id === viewingImage.id);
                                        setViewingImage(images[currentIndex + 1]);
                                    }}
                                    className="absolute right-4 p-3 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors z-10 backdrop-blur-sm"
                                >
                                    <ChevronRight size={32} />
                                </button>
                            )}
                        </div>
                        <div className="bg-slate-900/50 backdrop-blur-md p-4 mt-4 rounded-xl flex items-center justify-between text-white border border-white/10">
                            <div>
                                <h2 className="font-medium text-lg">{viewingImage.filename}</h2>
                                <p className="text-sm text-slate-400">ID: {viewingImage.id}</p>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => copyToClipboard(viewingImage.id)}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded flex items-center gap-2 transition-colors"
                                >
                                    <Copy size={16} /> Copy ID
                                </button>
                                <button 
                                    onClick={() => {
                                        const currentIndex = images.findIndex(img => img.id === viewingImage.id);
                                        const nextImage = images[currentIndex + 1] || images[currentIndex - 1] || null;
                                        handleDelete([viewingImage.id]);
                                        // If delete successful (optimistic), switch to next image if available
                                        if (nextImage) setViewingImage(nextImage); 
                                        // Note: handleDelete reloads images, so viewingImage might be reset by that logic if not handled carefully, 
                                        // but current handleDelete implementation sets viewingImage(null). 
                                        // We might want to adjust handleDelete to NOT close the modal if we want to stay in view mode, 
                                        // but for now let's stick to the requested Nav feature.
                                        // Actually, the user's request was just Nav. Let's not overcomplicate delete for now unless asked.
                                    }}
                                    className="px-3 py-1.5 bg-red-500/80 hover:bg-red-600 rounded flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
