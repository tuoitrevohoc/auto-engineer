import { useState, useEffect } from 'react';
import { getImages } from '@/app/actions';
import { X, Check } from 'lucide-react';
import Image from 'next/image';

interface ImageBrowserProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageId: string) => void;
}

interface ImageItem {
    id: string;
    filename: string;
    path: string;
    createdAt: string;
}

export function ImageBrowser({ isOpen, onClose, onSelect }: ImageBrowserProps) {
    const [images, setImages] = useState<ImageItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 15;

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setPage(1); // Reset to first page on open
            loadImages(1);
        }
    }, [isOpen]);

    const loadImages = (currentPage: number) => {
        setLoading(true);
        getImages(currentPage, limit)
            .then(data => {
                setImages(data.images);
                setTotal(data.total);
            })
            .finally(() => setLoading(false));
    };

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        loadImages(newPage);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800">Select Image</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            No images found. Upload one first.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {images.map(img => (
                                <div 
                                    key={img.id} 
                                    className="group relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-blue-500 transition-all hover:shadow-md"
                                    onClick={() => {
                                        onSelect(img.id);
                                        onClose();
                                    }}
                                >
                                    <Image 
                                        src={img.path} 
                                        alt={img.filename}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="text-xs text-white truncate">{img.filename}</div>
                                    </div>
                                    <div className="absolute top-2 right-2 bg-blue-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                        <Check size={12} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {total > limit && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                        <button
                            onClick={() => handlePageChange(Math.max(1, page - 1))}
                            disabled={page === 1 || loading}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                        >
                            Previous
                        </button>
                        <span className="text-xs text-slate-500">
                            Page {page} of {Math.ceil(total / limit)}
                        </span>
                        <button
                            onClick={() => handlePageChange(page + 1)}
                            disabled={page >= Math.ceil(total / limit) || loading}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
