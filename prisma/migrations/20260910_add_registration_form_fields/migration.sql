-- AlterTable
ALTER TABLE `Registration`
    ADD COLUMN `fullName` VARCHAR(191) NULL,
    ADD COLUMN `enrollmentNumber` VARCHAR(191) NULL,
    ADD COLUMN `collegeName` VARCHAR(191) NULL,
    ADD COLUMN `department` VARCHAR(191) NULL,
    ADD COLUMN `branch` VARCHAR(191) NULL,
    ADD COLUMN `semester` VARCHAR(191) NULL,
    ADD COLUMN `phoneNumber` VARCHAR(191) NULL;
