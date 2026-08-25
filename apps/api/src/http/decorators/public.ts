import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "rebox:isPublic";
export const Public = () => SetMetadata(IS_PUBLIC, true);
