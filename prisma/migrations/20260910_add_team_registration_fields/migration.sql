-- AlterTable
ALTER TABLE `Registration`
    ADD COLUMN `isTeam` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `teamName` VARCHAR(191) NULL,
    ADD COLUMN `teamSize` INTEGER NULL DEFAULT 1,
    ADD COLUMN `teamMembers` JSON NULL;
