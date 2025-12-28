import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"
import { cacheImageUrl, getCachedImageUrl } from "@/lib/imageCache"

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {
  src?: string;
}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  AvatarImageProps
>(({ className, src, ...props }, ref) => {
  const [imgSrc, setImgSrc] = React.useState<string | undefined>(undefined);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    if (!src) {
      setImgSrc(undefined);
      setHasError(false);
      return;
    }

    const cached = getCachedImageUrl(src);

    if (!cached.shouldLoad) {
      // Use cached result
      if (cached.url) {
        setImgSrc(cached.url);
        setHasError(false);
      } else {
        setImgSrc(undefined);
        setHasError(true);
      }
      return;
    }

    // Reset state for new URL
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = React.useCallback(() => {
    if (src) {
      cacheImageUrl(src, false);
    }
    setHasError(true);
    setImgSrc(undefined);
  }, [src]);

  const handleLoad = React.useCallback(() => {
    if (src) {
      cacheImageUrl(src, true);
    }
  }, [src]);

  // If there's an error or no src, don't render the image (fallback will show)
  if (hasError || !imgSrc) {
    return null;
  }

  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("aspect-square h-full w-full object-cover", className)}
      src={imgSrc}
      onError={handleError}
      onLoad={handleLoad}
      loading="lazy"
      {...props}
    />
  );
})
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback }
