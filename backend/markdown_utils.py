from markdown_it import MarkdownIt
from typing import List, Dict

md = MarkdownIt("commonmark")

def split_into_chunks(content: str, num_chunks: int = 3) -> List[Dict]:
    """
    Splits markdown content into N chunks based on document structure.
    Tries to split at header boundaries (H1/H2) to maintain document coherence.
    
    Args:
        content: The markdown content to split
        num_chunks: Number of chunks to split into (default: 3)
    
    Returns:
        List of chunk dictionaries
    """
    if not content:
        return []
    
    # Ensure num_chunks is at least 1
    num_chunks = max(1, num_chunks)
    
    tokens = md.parse(content)
    lines = content.splitlines(keepends=True)
    total_lines = len(lines)
    
    if total_lines == 0:
        return []
    
    # Find all header positions (H1, H2) as potential split points
    split_points = [0]  # Always start at line 0
    
    for token in tokens:
        if token.level == 0 and token.map and token.type == 'heading_open' and token.tag in ['h1', 'h2']:
            start_line = token.map[0]
            if start_line > 0 and start_line not in split_points:
                split_points.append(start_line)
    
    split_points.append(total_lines)  # End point
    split_points = sorted(set(split_points))
    
    # If we have fewer natural split points than requested chunks,
    # we'll use what we have
    if len(split_points) - 1 <= num_chunks:
        # Use natural header boundaries
        chunk_ranges = [(split_points[i], split_points[i+1]) for i in range(len(split_points)-1)]
    else:
        # We have more headers than requested chunks
        # Distribute split points evenly to get desired number of chunks
        target_lines_per_chunk = total_lines / num_chunks
        chunk_ranges = []
        current_start = 0
        
        for i in range(num_chunks):
            if i == num_chunks - 1:
                # Last chunk gets everything remaining
                chunk_ranges.append((current_start, total_lines))
            else:
                # Find the best split point near the target
                target_end = current_start + target_lines_per_chunk
                
                # Find closest header boundary
                best_split = total_lines
                best_distance = float('inf')
                
                for sp in split_points:
                    if sp > current_start:
                        distance = abs(sp - target_end)
                        if distance < best_distance:
                            best_distance = distance
                            best_split = sp
                        elif distance > best_distance:
                            # We've passed the optimal point
                            break
                
                chunk_ranges.append((current_start, best_split))
                current_start = best_split
    
    # Build chunks from ranges
    chunks = []
    for i, (start, end) in enumerate(chunk_ranges):
        chunk_content = "".join(lines[start:end])
        if chunk_content.strip():  # Only add non-empty chunks
            chunks.append({
                "chunk_index": len(chunks),
                "raw_text": chunk_content,
                "translated_text": None,
                "status": "pending",
                "start_line": start,
                "end_line": end
            })
    
    # If no chunks were created, create one with all content
    if not chunks:
        chunks.append({
            "chunk_index": 0,
            "raw_text": content,
            "translated_text": None,
            "status": "pending",
            "start_line": 0,
            "end_line": total_lines
        })
    
    return chunks

