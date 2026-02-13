// Agent avatar component with colored circle and initials

import { getAgentColor, getAgentInitials } from '../../utils/constants';

interface AgentAvatarProps {
  agentId: string | null;
  agentName?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * AgentAvatar component
 * Displays a colored circle with agent initials
 *
 * @param agentId - Agent document ID (used for color lookup)
 * @param agentName - Agent name (used for initials, defaults to agentId)
 * @param size - Size variant (sm: 24px, md: 32px, lg: 48px)
 * @param className - Additional CSS classes
 */
export function AgentAvatar({
  agentId,
  agentName,
  size = 'md',
  className = ''
}: AgentAvatarProps) {
  const displayName = agentName || agentId;
  const initials = getAgentInitials(displayName);
  const colorClass = getAgentColor(agentId);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${colorClass}
        rounded-full
        flex items-center justify-center
        font-semibold text-white
        ${className}
      `}
      title={displayName || 'Unassigned'}
    >
      {initials}
    </div>
  );
}
