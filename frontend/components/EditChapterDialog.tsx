"use client";

import { useEffect, useState } from "react";
import { updateChapter } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface EditChapterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chapter: any;
    onSuccess: () => void;
}

export function EditChapterDialog({ open, onOpenChange, chapter, onSuccess }: EditChapterDialogProps) {
    const [title, setTitle] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (chapter) {
            setTitle(chapter.title);
        }
    }, [chapter]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chapter) return;

        setLoading(true);
        try {
            await updateChapter(chapter.id, { title });
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            alert("Failed to update chapter");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Chapter</DialogTitle>
                    <DialogDescription>
                        Update the chapter title here.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
