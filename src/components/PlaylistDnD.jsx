// src/components/PlaylistDnD.jsx
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import Typography from '@mui/material/Typography';
import WarningIcon from '@mui/icons-material/Warning';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { getYouTubeId } from '../utils/youtube';

function SortablePlaylistItem({ item, onDelete, onPlay, busy, canEdit, currentVideoId }) {
  const { t } = useTranslation();
  
  const vId = getYouTubeId(item.url);
  const isActive = vId === currentVideoId;
  const isProblematic = false;
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const thumbUrl = vId 
    ? `https://i.ytimg.com/vi/${vId}/mqdefault.jpg` 
    : null;

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      divider
      sx={{
        backgroundColor: isActive 
          ? 'rgba(100, 108, 255, 0.2)' 
          : isProblematic
          ? 'rgba(255, 0, 0, 0.1)'
          : isDragging 
            ? 'rgba(255,255,255,0.1)' 
            : 'transparent',
        borderLeft: isActive ? '3px solid #646cff' : isProblematic ? '3px solid #ff4444' : '3px solid transparent',
        transition: 'background-color 0.2s, border-left 0.2s',
        alignItems: 'flex-start',
        py: 1,
        '&:hover': {
          backgroundColor: isActive 
            ? 'rgba(100, 108, 255, 0.3)' 
            : isProblematic
            ? 'rgba(255, 0, 0, 0.15)'
            : 'rgba(255,255,255,0.05)'
        }
      }}
    >
      {/* Ajouter un marqueur pour les vidéos problématiques */}
      {isProblematic && (
        <Box sx={{ position: 'absolute', top: 8, left: 8, color: 'error.main' }}>
          <WarningIcon fontSize="small" />
        </Box>
      )}
      {/* Drag Handle */}
      {canEdit && (
        <Box
          {...attributes}
          {...listeners}
          sx={{
            display: 'flex',
            alignItems: 'center',
            mr: 1,
            cursor: 'grab',
            opacity: 0.6,
            '&:hover': { opacity: 1 },
            touchAction: 'none',
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
      )}

      {/* Thumbnail */}
      {thumbUrl && (
        <Box
          component="img"
          src={thumbUrl}
          alt="miniature"
          sx={{
            width: 80,
            height: 45,
            borderRadius: 1,
            objectFit: 'cover',
            mr: 2,
            flexShrink: 0
          }}
        />
      )}

      <ListItemText
        primary={item.title || item.url}
        secondary={item.title ? null : item.url}
        sx={{ pr: 10, flex: 1 }}
      />

      <ListItemSecondaryAction>
        <IconButton
          edge="end"
          aria-label={t('playlist.play')}
          onClick={() => {
            if (onPlay) {
              onPlay(item.url);
            }
          }}
          sx={{ mr: 1 }}
          disabled={busy}
        >
          <PlayArrowIcon />
        </IconButton>
        {canEdit && (
          <IconButton
            edge="end"
            aria-label={t('playlist.delete')}
            color="error"
            onClick={() => onDelete(item.id)}
            disabled={busy}
          >
            <DeleteIcon />
          </IconButton>
        )}
      </ListItemSecondaryAction>
    </ListItem>
  );
}

export default function PlaylistDnD({ 
  items, 
  onDelete, 
  onPlay, 
  onReorder,
  busy,
  canEdit,
  currentVideoId
}) {
  const { t } = useTranslation();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || !canEdit) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const oldIndex = items.findIndex((item) => item.id === activeId);
    const newIndex = items.findIndex((item) => item.id === overId);

    if (oldIndex !== newIndex) {
      onReorder(oldIndex, newIndex);
    }
  };

  if (!items || items.length === 0) {
    return (
      <Typography sx={{ opacity: 0.8, textAlign: 'center', py: 3 }}>
        {t('playlist.noVideosYet')}
      </Typography>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
        <List dense>
          {items.map((item, index) => {
            const videoId = getYouTubeId(item.url)
            const isActive = videoId === currentVideoId
            return (
              <SortablePlaylistItem
                key={item.id}
                item={item}
                index={index}
                onDelete={onDelete}
                onPlay={onPlay}
                busy={busy}
                canEdit={canEdit}
                currentVideoId={currentVideoId}
                isActive={isActive}
              />
            )
          })}
        </List>
      </SortableContext>
    </DndContext>
  );
}