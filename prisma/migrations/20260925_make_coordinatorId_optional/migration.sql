-- AlterTable: Make coordinatorId nullable on Event table
ALTER TABLE `Event` MODIFY `coordinatorId` VARCHAR(191) NULL;

-- DropForeignKey (will be re-added as optional)
ALTER TABLE `Event` DROP FOREIGN KEY `Event_coordinatorId_fkey`;

-- AddForeignKey (optional relation)
ALTER TABLE `Event` ADD CONSTRAINT `Event_coordinatorId_fkey` FOREIGN KEY (`coordinatorId`) REFERENCES `Staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
