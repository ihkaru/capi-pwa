<?php

namespace App\Filament\Resources\AssignmentResponseResource;

use App\Constants;
use App\Filament\Resources\AssignmentResponseResource\Pages;
use App\Filament\Resources\AssignmentResponseResource\RelationManagers;
use App\Models\AssignmentResponse;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\KeyValue;
use Filament\Resources\Resource;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Select;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;

class AssignmentResponseResource extends Resource
{
    protected static ?string $model = AssignmentResponse::class;

    protected static string | BackedEnum | null $navigationIcon = 'heroicon-o-document-text';

    public static function form(Schema $form): Schema // Changed from Form to Schema
    {
        return $form
            ->schema([
                Select::make('assignment_id')
                    ->relationship('assignment', 'assignment_label')
                    ->required()
                    ->preload()
                    ->searchable()
                    ->disabledOn('edit'),
                Select::make('status')
                    ->options(Constants::getResponseStatuses())
                    ->required(),
                TextInput::make('version')
                    ->numeric()
                    ->required()
                    ->default(1),
                TextInput::make('form_version_used')
                    ->numeric()
                    ->required(),
                KeyValue::make('responses')
                    ->nullable(),
                DateTimePicker::make('submitted_by_ppl_at')
                    ->nullable(),
                DateTimePicker::make('reviewed_by_pml_at')
                    ->nullable(),
                DateTimePicker::make('reviewed_by_admin_at')
                    ->nullable(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('assignment.assignment_label')
                    ->label('Assignment')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('status')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('version')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('form_version_used')
                    ->numeric()
                    ->sortable(),
                TextColumn::make('submitted_by_ppl_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('reviewed_by_pml_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('reviewed_by_admin_at')
                    ->dateTime()
                    ->sortable(),
                TextColumn::make('created_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                TextColumn::make('updated_at')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                //
            ])
            ->actions([
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->bulkActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListAssignmentResponses::route('/'),
            'create' => Pages\CreateAssignmentResponse::route('/create'),
            'edit' => Pages\EditAssignmentResponse::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->withoutGlobalScopes([
                SoftDeletingScope::class,
            ]);
    }
}
