<?php

namespace App\Filament\Resources\Assignments;

use App\Filament\Resources\Assignments\Pages\CreateAssignment;
use App\Filament\Resources\Assignments\Pages\EditAssignment;
use App\Filament\Resources\Assignments\Pages\ListAssignments;
use App\Models\Assignment;
use App\Constants;
use BackedEnum;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;

class AssignmentResource extends Resource
{
    protected static ?string $model = Assignment::class;

    protected static string | BackedEnum | null $navigationIcon = 'heroicon-o-rectangle-stack';

    protected static ?string $recordTitleAttribute = 'assignment_label';

    public static function form(Schema $form): Schema // Changed from Form to Schema
    {
        return $form
            ->schema([
                Select::make('satker_id')
                    ->relationship('satker', 'name')
                    ->required()
                    ->searchable()
                    ->preload(),
                Select::make('kegiatan_statistik_id')
                    ->relationship('kegiatanStatistik', 'name')
                    ->required()
                    ->searchable()
                    ->preload(),
                Select::make('ppl_id')
                    ->relationship('ppl', 'name')
                    ->required()
                    ->searchable()
                    ->preload(),
                Select::make('pml_id')
                    ->relationship('pml', 'name')
                    ->required()
                    ->searchable()
                    ->preload(),
                TextInput::make('level_1_code')
                    ->maxLength(255)
                    ->nullable(),
                TextInput::make('level_2_code')
                    ->maxLength(255)
                    ->nullable(),
                TextInput::make('level_3_code')
                    ->maxLength(255)
                    ->nullable(),
                TextInput::make('level_4_code')
                    ->maxLength(255)
                    ->nullable(),
                TextInput::make('level_5_code')
                    ->maxLength(255)
                    ->nullable(),
                TextInput::make('level_6_code')
                    ->maxLength(255)
                    ->nullable(),
                TextInput::make('assignment_label')
                    ->required()
                    ->maxLength(255),
                Textarea::make('prefilled_data')
                    ->json()
                    ->nullable(),
                TextInput::make('level_4_code_full')
                    ->maxLength(255)
                    ->nullable(),
                TextInput::make('level_6_code_full')
                    ->maxLength(255)
                    ->nullable(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('satker.name')
                    ->label('Satker')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('kegiatanStatistik.name')
                    ->label('Kegiatan Statistik')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('ppl.name')
                    ->label('PPL')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('pml.name')
                    ->label('PML')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('level_1_code')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('level_2_code')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('level_3_code')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('level_4_code')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('level_5_code')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('level_6_code')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('assignment_label')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('prefilled_data')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('level_4_code_full')
                    ->searchable()
                    ->sortable(),
                TextColumn::make('level_6_code_full')
                    ->searchable()
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
                SelectFilter::make('satker')
                    ->relationship('satker', 'name'),
                SelectFilter::make('kegiatanStatistik')
                    ->relationship('kegiatanStatistik', 'name'),
                SelectFilter::make('ppl')
                    ->relationship('ppl', 'name'),
                SelectFilter::make('pml')
                    ->relationship('pml', 'name'),
            ])
            ->recordActions([
                EditAction::make(),
            ])
            ->toolbarActions([
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
            'index' => Pages\ListAssignments::route('/'),
            'create' => Pages\CreateAssignment::route('/create'),
            'edit' => Pages\EditAssignment::route('/{record}/edit'),
        ];
    }

    public static function getEloquentQuery(): Builder
    {
        $query = parent::getEloquentQuery();
        $user = auth()->user();

        if ($user->hasRole(Constants::ROLE_SUPER_ADMIN)) {
            return $query;
        }

        if ($user->hasRole(Constants::ROLE_ADMIN_SATKER)) {
            return $query->where('satker_id', $user->satker_id);
        }

        if ($user->hasRole(Constants::ROLE_ADMIN_KEGIATAN)) {
            // Admin Kegiatan can see assignments within their satker and for activities they are members of
            return $query->where('satker_id', $user->satker_id)
                ->whereHas('kegiatanStatistik.members', function ($q) use ($user) {
                    $q->where('user_id', $user->id);
                });
        }

        if ($user->hasRole(Constants::ROLE_PML)) {
            return $query->where('pml_id', $user->id);
        }

        if ($user->hasRole(Constants::ROLE_PPL)) {
            return $query->where('ppl_id', $user->id);
        }

        return $query->where('id', null); // No access by default
    }
}
