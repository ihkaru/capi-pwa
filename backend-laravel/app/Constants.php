<?php

namespace App;

class Constants
{
    // Nama Default untuk Roles (dikelola oleh Filament Shield)
    public const ROLE_SUPER_ADMIN = 'super_admin';
    public const ROLE_ADMIN_SATKER = 'admin_satker';
    public const ROLE_ADMIN_KEGIATAN = 'admin_kegiatan';
    public const ROLE_PML = 'PML';
    public const ROLE_PPL = 'PPL';

    // Status untuk Assignment Response
    public const STATUS_ASSIGNED = 'Assigned';
    public const STATUS_OPENED = 'Opened';
    public const STATUS_SUBMITTED_PPL = 'Submitted by PPL';
    public const STATUS_REJECTED_PML = 'Rejected by PML';
    public const STATUS_REJECTED_ADMIN = 'Rejected by Admin';
    public const STATUS_APPROVED_PML = 'Approved by PML';
    public const STATUS_APPROVED_ADMIN = 'Approved by Admin';
    public const STATUS_SUBMITTED_LOCAL = 'Submitted Local'; // New status for locally submitted but not yet synced assignments

    public static function getResponseStatuses(): array
    {
        return [
            self::STATUS_ASSIGNED,
            self::STATUS_OPENED,
            self::STATUS_SUBMITTED_PPL,
            self::STATUS_REJECTED_PML,
            self::STATUS_REJECTED_ADMIN,
            self::STATUS_APPROVED_PML,
            self::STATUS_APPROVED_ADMIN,
            self::STATUS_SUBMITTED_LOCAL,
        ];
    }
}
