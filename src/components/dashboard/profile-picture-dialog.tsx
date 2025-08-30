
"use client";

import { useState, useRef, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UploadCloud, Trash2 } from 'lucide-react';

type ProfilePictureDialogProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAvatarChange: (newUrl: string) => void;
  currentAvatar: string;
};

const DEFAULT_AVATAR = "https://picsum.photos/32/32";


export function ProfilePictureDialog({
  isOpen,
  onOpenChange,
  onAvatarChange,
  currentAvatar,
}: ProfilePictureDialogProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setPreview(null);
      setFile(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [isOpen]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please select an image file.',
        });
      }
    }
  };

  const handleSaveChanges = () => {
    if (preview) {
      onAvatarChange(preview);
      toast({
        title: 'Avatar Updated',
        description: 'Your profile picture has been changed.',
      });
      onOpenChange(false);
    }
  };
  
  const handleRemovePicture = () => {
    onAvatarChange(DEFAULT_AVATAR);
     toast({
        title: 'Avatar Reset',
        description: 'Your profile picture has been reset to the default.',
      });
    onOpenChange(false);
  }

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Profile Picture</DialogTitle>
          <DialogDescription>
            Upload a new photo to use as your avatar, or remove your current one.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <div className="flex justify-center">
                <Image
                    src={preview || currentAvatar}
                    width={128}
                    height={128}
                    alt="Avatar Preview"
                    className="rounded-full object-cover w-32 h-32 border-4 border-muted"
                />
            </div>
          <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
            <Label htmlFor="picture">Upload new picture</Label>
            <Input id="picture" type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef}/>
          </div>
        </div>
        <DialogFooter className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Button 
                variant="destructive" 
                onClick={handleRemovePicture}
                className="col-span-2 sm:col-span-1"
                disabled={currentAvatar === DEFAULT_AVATAR}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
            </Button>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSaveChanges} disabled={!file}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
