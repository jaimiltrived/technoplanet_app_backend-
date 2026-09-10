-- CreateTable
CREATE TABLE `MailTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `recipientType` VARCHAR(191) NOT NULL DEFAULT 'all',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MailTemplate_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MailLog` (
    `id` VARCHAR(191) NOT NULL,
    `sentById` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NULL,
    `recipientType` VARCHAR(191) NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `totalRecipients` INTEGER NOT NULL,
    `sentCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MailLog` ADD CONSTRAINT `MailLog_sentById_fkey` FOREIGN KEY (`sentById`) REFERENCES `Staff`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
