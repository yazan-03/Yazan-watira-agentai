from search_service import search_client


def inspect_all_chunks():

    results = search_client.search(
        search_text="*",
        select=["id", "source", "content"],
        top=100
    )

    chunks = list(results)

    print("\n" + "=" * 80)
    print(f"TOTAL CHUNKS: {len(chunks)}")
    print("=" * 80)

    for i, chunk in enumerate(chunks, start=1):

        print(f"\nCHUNK #{i}")
        print("-" * 80)

        print(f"ID: {chunk['id']}")
        print(f"Source: {chunk['source']}")

        print("\nContent:")
        print(chunk["content"])

        print("\n" + "=" * 80)


if __name__ == "__main__":
    inspect_all_chunks()