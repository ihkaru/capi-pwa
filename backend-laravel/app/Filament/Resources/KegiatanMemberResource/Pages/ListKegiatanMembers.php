<?php

namespace App\Filament\Resources\KegiatanMemberResource\Pages;

use App\Filament\Resources\KegiatanMemberResource\KegiatanMemberResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListKegiatanMembers extends ListRecords
{
    protected static string $resource = KegiatanMemberResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
