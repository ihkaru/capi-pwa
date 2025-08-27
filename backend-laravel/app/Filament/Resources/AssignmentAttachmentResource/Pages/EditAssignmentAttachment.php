<?php

namespace App\Filament\Resources\AssignmentAttachmentResource\Pages;

use App\Filament\Resources\AssignmentAttachmentResource\AssignmentAttachmentResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditAssignmentAttachment extends EditRecord
{
    protected static string $resource = AssignmentAttachmentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }
}
