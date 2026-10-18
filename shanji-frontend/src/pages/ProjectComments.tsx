import { useParams } from "react-router-dom";
import CommentsSection from "../features/comments/CommentsSection";

function ProjectComments() {
  const { id } = useParams<{ id: string }>();
  if (!id) return null;
  return <CommentsSection projectId={id} />;
}

export default ProjectComments;
