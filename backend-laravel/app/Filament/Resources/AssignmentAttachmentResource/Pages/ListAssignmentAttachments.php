<?php

namespace App\Filament\Resources\AssignmentAttachmentResource\Pages;

use App\Filament\Resources\AssignmentAttachmentResource\AssignmentAttachmentResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListAssignmentAttachments extends ListRecords
{
    protected static string $resource = AssignmentAttachmentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}
