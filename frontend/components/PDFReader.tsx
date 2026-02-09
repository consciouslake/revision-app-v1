"use client";

// import { Document, Page } from 'react-pdf';
// import { useState } from 'react';

export default function PDFReader({ url }: { url: string }) {
    // Placeholder using iframe for now until react-pdf is installed and configured
    return (
        <div className="h-full w-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            {url ? (
                <iframe src={url} className="w-full h-full" title="PDF Viewer" />
            ) : (
                <p className="text-gray-500">No PDF selected</p>
            )}
        </div>
    );
}
