<?php

namespace App\Filament\Resources\KegiatanMemberResource\Pages;

use App\Filament\Resources\KegiatanMemberResource\KegiatanMemberResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditKegiatanMember extends EditRecord
{
    protected static string $resource = KegiatanMemberResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
