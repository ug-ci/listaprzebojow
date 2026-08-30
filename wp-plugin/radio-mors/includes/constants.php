<?php
// Statusy i trendy (VARCHAR w DB, stałe w kodzie).
final class Mors_Enum {
    const TRACK_STATUSES   = [ 'WAITING_ROOM', 'CHART', 'ARCHIVED', 'REJECTED' ];
    const EDITION_STATUSES = [ 'DRAFT', 'ACTIVE', 'FROZEN', 'BROADCASTING', 'ARCHIVED' ];
    const TRENDS           = [ 'NEW', 'UP', 'DOWN', 'SAME', 'REENTRY' ];
    const CAP_EDIT_MUSIC   = 'mors_edit_music';
    const CAP_PRESENT      = 'mors_present';
    const CAP_MANAGE       = 'mors_manage_editors';
}
